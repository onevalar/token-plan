//! The macOS menu-bar strip image. Windows and Linux trays use the app icon.
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
fn draw(pixmap: &mut tiny_skia::Pixmap, svg: &str, transform: tiny_skia::Transform) {
    let options = usvg::Options { fontdb: fonts(), ..usvg::Options::default() };
    if let Ok(tree) = usvg::Tree::from_str(svg, &options) { resvg::render(&tree, transform, &mut pixmap.as_mut()); }
}

/// Draws a provider mark into a `side`-pixel square whose top-left corner is (x, y).
fn draw_logo(pixmap: &mut tiny_skia::Pixmap, family: &str, x: f32, y: f32, side: f32) {
    let Ok(tree) = usvg::Tree::from_str(logo(family), &usvg::Options::default()) else { return };
    let size = tree.size();
    let scale = side / size.width().max(size.height());
    let transform = tiny_skia::Transform::from_scale(scale, scale)
        .post_translate(x + (side - size.width() * scale) / 2.0, y + (side - size.height() * scale) / 2.0);
    resvg::render(&tree, transform, &mut pixmap.as_mut());
}

/// Provider SVGs have different internal padding. These measured sizes leave 1px of
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

fn reading(metric: &crate::model::Metric) -> String {
    if !metric.has_data { return "—".into(); }
    metric.percent.map(|v| format!("{:.0}%", v.clamp(0.0, 999.0)))
        .or_else(|| metric.amount.map(|v| if v >= 1000.0 { format!("{:.0}k", v / 1000.0) } else { format!("{v:.0}") }))
        .unwrap_or_else(|| "—".into())
}

/// One account's group in the menu-bar strip: a quota ring around the provider mark, or
/// the mark followed by up to two values. Black on transparent so macOS tints it.
pub fn render(account: &Account, badge: Option<usize>, style: &str) -> Image<'static> {
    let mut pixmap = tiny_skia::Pixmap::new(220, HEIGHT).unwrap();
    let pinned: Vec<_> = account.metrics.iter().filter(|m| m.pinned).take(2).collect();
    let ring = style == "ring" && pinned.iter().any(|m| m.percent.is_some());
    if pinned.is_empty() {
        draw_logo(&mut pixmap, &account.family, 4.0, 4.0, 32.0);
        if let Some(n) = badge { text(&mut pixmap, &n.to_string(), 36.0, 12.0, 12.0); }
    } else if ring {
        let mut svg = format!(r#"<svg xmlns="http://www.w3.org/2000/svg" width="40" height="{HEIGHT}">"#);
        for (i, m) in pinned.iter().enumerate() {
            let percent = if m.has_data { m.percent.unwrap_or(0.0).clamp(0.0, 100.0) } else { 0.0 };
            let r = 17.5 - i as f32 * 4.5;
            svg += &format!(r#"<circle cx="20" cy="20" r="{r}" fill="none" stroke="black" stroke-opacity="0.25" stroke-width="2.6"/>"#);
            if percent > 0.0 {
                svg += &format!(r#"<circle cx="20" cy="20" r="{r}" fill="none" stroke="black" stroke-width="2.6" stroke-linecap="round" pathLength="100" stroke-dasharray="{percent} 100" transform="rotate(-90 20 20)"/>"#);
            }
        }
        svg += "</svg>";
        draw(&mut pixmap, &svg, tiny_skia::Transform::identity());
        let side = ring_logo_side(&account.family, pinned.len());
        draw_logo(&mut pixmap, &account.family, 20.0 - side / 2.0, 20.0 - side / 2.0, side);
        if let Some(n) = badge { text(&mut pixmap, &n.to_string(), 40.0, 12.0, 12.0); }
    } else {
        draw_logo(&mut pixmap, &account.family, 0.0, 6.0, 28.0);
        let x = if let Some(n) = badge { text(&mut pixmap, &n.to_string(), 28.0, 12.0, 12.0); 38.0 } else { 33.0 };
        if pinned.len() == 1 { text(&mut pixmap, &reading(pinned[0]), x, 29.0, 24.0); }
        else { text(&mut pixmap, &reading(pinned[0]), x, 17.0, 17.0); text(&mut pixmap, &reading(pinned[1]), x, 37.0, 17.0); }
    }
    image(trimmed(&pixmap))
}

/// The whole macOS menu-bar strip: every selected account in saved order, or the
/// TokenPlan mark when none is selected.
pub fn strip(state: &DesktopState) -> Image<'static> {
    let groups: Vec<_> = visible(state).into_iter().map(|(a, badge)| render(a, badge, &state.settings.tray_style)).collect();
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
    fn larger_marks_remain_inside_the_innermost_ring() {
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
                assert!(radius<inner-1.0,"{family} mark touches its {rings} rings");
                assert!(radius>inner*0.75,"{family} mark does not use the available inner space");
            }
        }
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
