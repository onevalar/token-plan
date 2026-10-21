//! macOS menu-bar strip rendering and shared provider artwork/font helpers.
use crate::{model::{Account, DesktopState}, tray::visible};
use resvg::{tiny_skia, usvg};
use std::{collections::HashMap, sync::{Arc, OnceLock}};
use tauri::image::Image;

fn logo(family: &str) -> &'static str {
    macro_rules! svg { ($name:literal) => { include_str!(concat!("../icons/providers/",$name,".svg")) }; }
    match family {
        "claude"=>svg!("claude"), "codex"=>svg!("codex"), "cursor"=>svg!("cursor"), "antigravity"=>svg!("antigravity"),
        "amp"=>svg!("amp"), "copilot"=>svg!("copilot"), "deepseek"=>svg!("deepseek"), "devin"=>svg!("devin"), "grok"=>svg!("grok"),
        "moonshot"=>svg!("moonshot"), "minimax"=>svg!("minimax"), "ollama"=>svg!("ollama"), "opencode"=>svg!("opencode"),
        "openrouter"=>svg!("openrouter"), "siliconflow"=>svg!("siliconflow"), "zai"=>svg!("zai"), _=>svg!("tokenplan")
    }
}

/// Pixel height of every tray image; macOS scales it to the menu bar's icon height.
const HEIGHT: u32 = 40;
/// Space between account groups in the menu-bar strip.
const GAP: u32 = 18;
const FONT: &str = "'SF Pro Text','Helvetica Neue',Helvetica,Arial,'DejaVu Sans',sans-serif";

fn fonts() -> Arc<usvg::fontdb::Database> {
    static FONTS: OnceLock<Arc<usvg::fontdb::Database>> = OnceLock::new();
    FONTS.get_or_init(|| { let mut db = usvg::fontdb::Database::new(); db.load_system_fonts(); Arc::new(db) }).clone()
}

/// Draws an SVG document onto the pixmap at its own coordinates.
pub(crate) fn draw(pixmap: &mut tiny_skia::Pixmap, svg: &str, transform: tiny_skia::Transform) {
    let options = usvg::Options { fontdb: fonts(), ..usvg::Options::default() };
    if let Ok(tree) = usvg::Tree::from_str(svg, &options) { resvg::render(&tree, transform, &mut pixmap.as_mut()); }
}

/// Draws a provider mark into a `side`-pixel square whose top-left corner is (x, y).
pub(crate) fn draw_logo(pixmap: &mut tiny_skia::Pixmap, family: &str, x: f32, y: f32, side: f32) {
    let Ok(tree) = usvg::Tree::from_str(logo(family), &usvg::Options::default()) else { return };
    let size = tree.size();
    let scale = side / size.width().max(size.height());
    let transform = tiny_skia::Transform::from_scale(scale, scale)
        .post_translate(x + (side - size.width() * scale) / 2.0, y + (side - size.height() * scale) / 2.0);
    resvg::render(&tree, transform, &mut pixmap.as_mut());
}

/// Provider SVGs have different internal padding. These measured sizes leave at least 3px (1.5pt) of
/// clearance from the innermost ring; the web preview uses the same table.
fn ring_logo_side(family: &str, rings: usize) -> f32 {
    static SIZES: OnceLock<HashMap<String,[f32;2]>> = OnceLock::new();
    let sizes=SIZES.get_or_init(||serde_json::from_str(include_str!("../../src/tray-logo-sizes.json")).expect("bundled logo sizes"));
    sizes.get(family).unwrap_or(&sizes["tokenplan"])[if rings>1 {1} else {0}]
}

fn text(pixmap: &mut tiny_skia::Pixmap, value: &str, x: f32, baseline: f32, size: f32) {
    let svg = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{HEIGHT}"><text x="{x}" y="{baseline}" font-family="{FONT}" font-size="{size}" font-weight="700" fill="black">{value}</text></svg>"#, w = pixmap.width());
    draw(pixmap, &svg, tiny_skia::Transform::identity());
}

pub(crate) fn reading(metric: &crate::model::Metric) -> String {
    if !metric.has_data { return "—".into(); }
    metric.percent.map(|v| format!("{:.0}%", v.clamp(0.0, 999.0)))
        .or_else(|| metric.amount.map(|v| if v >= 1000.0 { format!("{:.0}k", v / 1000.0) } else { format!("{v:.0}") }))
        .unwrap_or_else(|| "—".into())
}

/// A restrained superscript in a 12px slot, or centered inside three rings.
/// Values above nine use +; the menu/tooltip still identify every account in full.
fn draw_badge(pixmap: &mut tiny_skia::Pixmap, badge: Option<usize>, center: Option<u32>) {
    if let Some(n) = badge {
        let label = if n <= 9 { n.to_string() } else { "+".into() };
        let x = center.unwrap_or(46);
        let baseline = if center.is_some() { 24.5 } else { 14.0 };
        let svg = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{HEIGHT}"><text x="{x}" y="{baseline}" text-anchor="middle" font-family="{FONT}" font-size="13" font-weight="600" fill="black" fill-opacity="0.85">{label}</text></svg>"#, w = pixmap.width());
        draw(pixmap, &svg, tiny_skia::Transform::identity());
    }
}

/// One account's group: a permanent faint track and a stronger progress arc.
/// Alpha-only template rendering lets macOS choose black/white for the menu bar.
#[cfg(test)]
fn render(account: &Account, badge: Option<usize>, style: &str) -> Image<'static> {
    render_position(account,badge,style,"inside")
}

fn render_position(account: &Account, badge: Option<usize>, style: &str, position: &str) -> Image<'static> {
    let mut pixmap = tiny_skia::Pixmap::new(512, HEIGHT).unwrap();
    let pinned: Vec<_> = account.metrics.iter().filter(|m| m.pinned).take(3).collect();
    let ring = style == "ring" && !pinned.is_empty() && pinned.iter().all(|m| m.percent.is_some() || m.unit == "percent");
    let triple = ring && pinned.len() == 3;
    let core_width = if badge.is_some() && !triple { 52 } else { 40 };
    let outside = ring && (position == "left" || pinned.len() > 2);
    let ring_offset = if triple { 36 } else if outside { core_width + 6 } else { 0 };
    if pinned.is_empty() {
        draw_logo(&mut pixmap, &account.family, 4.0, 4.0, 32.0);
    } else if ring {
        let mut svg = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="40" height="{HEIGHT}">"#);
        for (i, m) in pinned.iter().enumerate() {
            // The bridge has already converted used vs remaining; never invert twice.
            let percent = if m.has_data { m.percent.unwrap_or(0.0).clamp(0.0, 100.0) } else { 0.0 };
            let r = 17.5 - i as f32 * 4.5;
            svg += &format!(r#"<circle cx="20" cy="20" r="{r}" fill="none" stroke="black" stroke-opacity="0.32" stroke-width="2.6"/>"#);
            if percent >= 100.0 {
                svg += &format!(r#"<circle cx="20" cy="20" r="{r}" fill="none" stroke="black" stroke-width="2.6"/>"#);
            } else if percent > 0.0 {
                // Use physical SVG lengths: the native rasterizer does not normalize
                // stroke dash lengths using pathLength like a browser does.
                let circumference = 2.0 * std::f32::consts::PI * r;
                let arc = circumference * percent as f32 / 100.0;
                svg += &format!(r#"<circle cx="20" cy="20" r="{r}" fill="none" stroke="black" stroke-width="2.6" stroke-linecap="round" stroke-dasharray="{arc} {circumference}" transform="rotate(-90 20 20)"/>"#);
            }
        }
        svg += "</svg>";
        draw(&mut pixmap, &svg, tiny_skia::Transform::from_translate(ring_offset as f32,0.0));
        if outside {
            draw_logo(&mut pixmap,&account.family,6.0,6.0,28.0);
        } else {
            let side = ring_logo_side(&account.family, pinned.len());
            draw_logo(&mut pixmap, &account.family, 20.0 - side / 2.0, 20.0 - side / 2.0, side);
        }
    } else {
        draw_logo(&mut pixmap, &account.family, 6.0, 6.0, 28.0);
        let x = core_width as f32 + 4.0;
        if pinned.len() == 1 { text(&mut pixmap, &reading(pinned[0]), x, 29.0, 24.0); }
        else if pinned.len() == 2 { text(&mut pixmap, &reading(pinned[0]), x, 17.0, 17.0); text(&mut pixmap, &reading(pinned[1]), x, 37.0, 17.0); }
        else { text(&mut pixmap,&pinned.iter().map(|m|reading(m)).collect::<Vec<_>>().join(" · "),x,28.0,21.0); }
    }
    draw_badge(&mut pixmap, badge, triple.then_some(ring_offset + 20));
    // Preserve the 40px mark cell. Cropping its left edge makes different marks and
    // badge digits move the circle and changes apparent inter-account spacing.
    let width = if outside {ring_offset+40} else if ring || pinned.is_empty() { core_width } else {
        (0..pixmap.width()).rev().find(|&x| (0..HEIGHT).any(|y| pixmap.pixel(x,y).unwrap().alpha()>0)).map_or(core_width, |x| x+2)
    };
    image(pixmap.clone_rect(tiny_skia::IntRect::from_xywh(0,0,width,HEIGHT).unwrap()).unwrap())
}

/// The whole macOS menu-bar strip: every selected account in saved order, or the
/// TokenPlan mark when none is selected.
pub fn strip(state: &DesktopState) -> Image<'static> {
    let groups: Vec<_> = visible(state).into_iter().map(|(a, badge)| render_position(a, badge, &state.settings.tray_style, &state.settings.ring_icon_position)).collect();
    if groups.is_empty() {
        let mut pixmap = tiny_skia::Pixmap::new(HEIGHT, HEIGHT).unwrap();
        draw_logo(&mut pixmap, "tokenplan", 2.0, 2.0, 36.0);
        return image(trimmed(&pixmap));
    }
    let width = groups.iter().map(|g| g.width()).sum::<u32>() + GAP * (groups.len() as u32 - 1);
    let mut bytes = vec![0u8; (width * HEIGHT * 4) as usize];
    let mut left = 0;
    for group in &groups {
        for y in 0..HEIGHT {
            let row = (y * group.width() * 4) as usize..((y + 1) * group.width() * 4) as usize;
            let start = ((y * width + left) * 4) as usize;
            bytes[start..start + row.len()].copy_from_slice(&group.rgba()[row]);
        }
        left += group.width() + GAP;
    }
    Image::new_owned(bytes, width, HEIGHT)
}

/// Crops transparent columns from both sides; the menu bar already pads every item.
fn trimmed(pixmap: &tiny_skia::Pixmap) -> tiny_skia::Pixmap {
    let w = pixmap.width();
    let filled = |x: u32| (0..HEIGHT).any(|y| pixmap.pixel(x, y).is_some_and(|p| p.alpha() > 0));
    let (Some(first), Some(last)) = ((0..w).find(|&x| filled(x)), (0..w).rev().find(|&x| filled(x))) else { return pixmap.clone() };
    let rect = tiny_skia::IntRect::from_xywh(first as i32, 0, last - first + 1, HEIGHT).unwrap();
    pixmap.clone_rect(rect).unwrap()
}

fn image(pixmap: tiny_skia::Pixmap) -> Image<'static> {
    // Template images use only alpha; provider marks may carry their own colors.
    let bytes = pixmap.pixels().iter().flat_map(|p| [0, 0, 0, p.alpha()]).collect();
    Image::new_owned(bytes, pixmap.width(), pixmap.height())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> DesktopState { serde_json::from_str(include_str!("../../tests/fixtures/desktop.json")).unwrap() }
    #[test]
    fn one_strip_holds_every_selected_account_in_order() {
        let mut s=fixture();
        for style in ["ring","percentage"] {
            s.settings.tray_style=style.into();
            let groups:Vec<_>=visible(&s).into_iter().map(|(a,b)|render(a,b,style)).collect();
            let strip=strip(&s);
            assert_eq!(strip.height(),HEIGHT);
            assert_eq!(strip.width(),groups.iter().map(|g|g.width()).sum::<u32>()+GAP*(groups.len() as u32-1));
            // Each group starts at its offset with its own first column.
            let mut left=0;
            for g in &groups {
                let column=|img:&Image,x:u32|(0..HEIGHT).map(|y|img.rgba()[((y*img.width()+x)*4+3) as usize]).collect::<Vec<_>>();
                assert_eq!(column(&strip,left),column(g,0));
                left+=g.width()+GAP;
            }
        }
        for a in &mut s.accounts { a.tray=false; }
        let fallback=strip(&s);
        assert!(fallback.rgba().chunks_exact(4).any(|p|p[3]>0),"No selected account must still show the TokenPlan mark");
    }
    #[test]
    fn marks_have_visible_clearance_inside_both_ring_sizes() {
        for family in ["claude","codex","cursor","antigravity","amp","copilot","deepseek","devin","grok","moonshot","minimax","ollama","opencode","openrouter","siliconflow","zai","tokenplan"] {
            for rings in [1,2] {
                let inner=17.5-(rings-1) as f32*4.5-1.3;
                let side=ring_logo_side(family,rings);
                // Supersample the mark alone so transparent padding cannot hide a
                // corner touching the ring at Retina or fractional display scales.
                let mut mark=tiny_skia::Pixmap::new(160,160).unwrap();
                draw_logo(&mut mark,family,80.0-side*2.0,80.0-side*2.0,side*4.0);
                let radius=(0..160).flat_map(|y|(0..160).map(move |x|(x,y)))
                    .filter(|&(x,y)|mark.pixel(x,y).unwrap().alpha()>16)
                    .map(|(x,y)|((x as f32+0.5-80.0).powi(2)+(y as f32+0.5-80.0).powi(2)).sqrt()/4.0)
                    .fold(0.0_f32,f32::max);
                assert!(radius<inner-3.0,"{family} mark touches its {rings} rings");
                assert!(radius>inner*0.60,"{family} mark does not use the available inner space");
            }
        }
    }
    fn ring_account(rings: usize, percent: f64) -> Account {
        let mut a=fixture().accounts[0].clone();
        let mut m=a.metrics[0].clone();m.pinned=true;m.has_data=true;m.percent=Some(percent);
        a.metrics=vec![m;rings];a
    }
    #[test]
    fn tracks_are_complete_and_arcs_match_quarters_on_both_rings() {
        for rings in [1,2] {
            for percent in [0.,25.,50.,75.,100.] {
                let a=ring_account(rings,percent);
                let img=render(&a,None,"ring");
                for ring in 0..rings {
                    let radius=17.5-ring as f32*4.5;
                    for quadrant in 0..4 {
                        let angle=(45.+90.*quadrant as f32).to_radians();
                        let x=(20.+radius*angle.sin()).floor() as u32;
                        let y=(20.-radius*angle.cos()).floor() as u32;
                        let alpha=img.rgba()[((y*img.width()+x)*4+3) as usize];
                        if (quadrant as f64+0.5)*25.<percent {
                            assert!(alpha>230,"{rings} rings {percent}% quadrant {quadrant}: {alpha}");
                        } else {
                            assert!((60..=100).contains(&alpha),"track missing/arc exceeds quota: {rings} rings {percent}% quadrant {quadrant}: {alpha}");
                        }
                    }
                }
            }
            let mut missing=ring_account(rings,0.);
            for m in &mut missing.metrics {m.has_data=false;m.percent=None;m.unit="percent".into();}
            assert_eq!(render(&missing,None,"ring").rgba(),render(&ring_account(rings,0.),None,"ring").rgba());
        }
    }
    #[test]
    fn badges_one_to_nine_keep_the_mark_and_cell_alignment() {
        for rings in [1,2] {
            let a=ring_account(rings,50.);
            let plain=render(&a,None,"ring");
            assert_eq!(plain.width(),40);
            for n in 1..=9 {
                let numbered=render(&a,Some(n),"ring");
                assert_eq!(numbered.width(),52);
                for y in 0..HEIGHT {
                    assert_eq!(&plain.rgba()[(y*40*4) as usize..((y+1)*40*4) as usize],
                        &numbered.rgba()[(y*52*4) as usize..((y*52+40)*4) as usize]);
                }
                let ink=(0..HEIGHT).flat_map(|y|(40..52).map(move|x|(x,y)))
                    .filter(|&(x,y)|numbered.rgba()[((y*52+x)*4+3) as usize]>100).count();
                assert!(ink>15,"badge {n} is illegible");
            }
            // Overflow cannot grow a two-digit label into a neighboring account.
            assert_eq!(render(&a,Some(10),"ring").width(),52);
        }
    }
    #[test]
    fn three_rings_move_the_logo_left_without_losing_values_on_style_changes() {
        let mut a=ring_account(3,50.);
        let automatic=render_position(&a,Some(2),"ring","inside");
        let left=render_position(&a,Some(2),"ring","left");
        assert_eq!(automatic.rgba(),left.rgba());
        assert_eq!(left.width(),76);
        // The innermost arc is distinct from the numbered center and its track.
        let alpha=|x:u32,y:u32|left.rgba()[((y*left.width()+x)*4+3) as usize];
        assert!(alpha(64,20)>230);
        assert!((60..=100).contains(&alpha(47,20)));
        assert!((51..62).any(|x|(14..26).any(|y|alpha(x,y)>150)), "badge belongs inside the inner ring");
        let percentage=render_position(&a,Some(2),"percentage","left");
        a.metrics[2].percent=Some(87.);
        let changed=render_position(&a,Some(2),"percentage","left");
        assert_ne!(percentage.rgba(),changed.rgba(),"third percentage must be rendered");
        for n in 1..=9 {assert_eq!(render_position(&a,Some(n),"ring","left").width(),76);}
    }

    #[test]
    fn three_ring_badges_change_only_the_center_without_moving_the_mark() {
        let a=ring_account(3,50.);
        let plain=render_position(&a,None,"ring","left");
        for badge in 1..=10 {
            let numbered=render_position(&a,Some(badge),"ring","left");
            assert_eq!(numbered.width(),plain.width());
            let mut ink=0;
            for y in 0..HEIGHT { for x in 0..plain.width() {
                let i=((y*plain.width()+x)*4+3) as usize;
                if plain.rgba()[i]!=numbered.rgba()[i] {
                    assert!((x as f32-56.).hypot(y as f32-20.)<7.2,"badge overlaps inner track");
                    ink+=1;
                }
            }}
            assert!(ink>15,"badge must be legible");
        }
    }

    #[test]
    fn mixed_metrics_keep_amounts_instead_of_drawing_a_false_empty_ring() {
        let mut a=ring_account(3,25.);
        a.metrics[2].percent=None;a.metrics[2].unit="dollars".into();a.metrics[2].amount=Some(125.);
        let ring=render_position(&a,None,"ring","left");
        assert_eq!(ring.rgba(),render_position(&a,None,"percentage","left").rgba());
        a.metrics[2].amount=Some(750.);
        assert_ne!(ring.rgba(),render_position(&a,None,"ring","left").rgba());
    }

    #[test]
    fn export_tray_design_review() {
        let Ok(path)=std::env::var("TOKENPLAN_TRAY_REVIEW") else{return};
        let width=1120;let height=688;
        let mut sheet=tiny_skia::Pixmap::new(width,height).unwrap();
        let rows=[("TRACK / 0  25  50  75  100",false,0), ("ACCOUNTS / 1 TO 9",false,1),
            ("TWO RINGS / CLEARANCE",false,2),("LEFT / ONE, TWO, THREE",false,3),("TRACK / 0  25  50  75  100",true,0),
            ("ACCOUNTS / 1 TO 9",true,1),("TWO RINGS / CLEARANCE",true,2),("LEFT / ONE, TWO, THREE",true,3)];
        for (row,(label,dark,kind)) in rows.iter().enumerate() {
            let top=row as u32*84;let bg=if *dark{28}else{242};let fg=if *dark{245}else{20};
            for y in top..top+84 {for x in 0..width {
                let offset=((y*width+x)*4) as usize;sheet.data_mut()[offset..offset+4].copy_from_slice(&[bg,bg,bg,255]);
            }}
            let svg=format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"><text x="24" y="{}" font-family="{FONT}" font-size="16" fill="rgb({fg},{fg},{fg})">{label}</text></svg>"#,top+47);
            draw(&mut sheet,&svg,tiny_skia::Transform::identity());
            let count=if *kind==1{9}else if *kind==3{3}else{5};
            for col in 0..count {
                let mut a=ring_account(if *kind==3{col+1}else if *kind==2{2}else{1},if *kind==0{col as f64*25.}else{55.});
                if *kind==2 {a.family=["claude","codex","cursor","antigravity","opencode"][col].into();}
                let icon=render_position(&a,if *kind==1||*kind==3{Some(col+1)}else{None},"ring",if *kind==3{"left"}else{"inside"});
                let left=344+col as u32*(if *kind==3{150}else{82});
                for y in 0..HEIGHT {for x in 0..icon.width() {
                    let alpha=icon.rgba()[((y*icon.width()+x)*4+3) as usize] as f32/255.;
                    let v=(bg as f32*(1.-alpha)+fg as f32*alpha).round() as u8;
                    let offset=(((top+22+y)*width+left+x)*4) as usize;
                    sheet.data_mut()[offset..offset+4].copy_from_slice(&[v,v,v,255]);
                }}
            }
        }
        sheet.save_png(path).unwrap();
    }
    #[test]
    fn unpinned_accounts_keep_a_visible_logo_in_both_styles() {
        let mut s=fixture();
        for metric in &mut s.accounts[0].metrics { metric.pinned=false; }
        let ring=render(&s.accounts[0],None,"ring");
        let percentage=render(&s.accounts[0],None,"percentage");
        assert_eq!(ring.rgba(),percentage.rgba());
        // The standalone mark is larger than the ring inset mark.
        assert!(ring.width()>20);
    }
    #[test]
    fn readings_are_black_template_pixels_on_transparency() {
        let s=fixture();
        for style in ["ring","percentage"] {
            let image=render(&s.accounts[0],Some(1),style);
            assert_eq!(image.height(),HEIGHT);
            assert!(image.rgba().chunks_exact(4).any(|p|p[3]==0));
            assert!(image.rgba().chunks_exact(4).filter(|p|p[3]>0).all(|p|p[0]==0&&p[1]==0&&p[2]==0));
        }
        // Values sit to the right of the 28px mark, so percentage groups are wider than rings.
        assert!(render(&s.accounts[0],None,"percentage").width()>render(&s.accounts[0],None,"ring").width());
    }
}
