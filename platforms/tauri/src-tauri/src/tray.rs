use crate::model::{Account, DesktopState};
use resvg::{tiny_skia, usvg};
use std::{collections::HashMap, sync::Mutex};
use tauri::{image::Image, menu::{Menu, MenuItem}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}, Manager};
#[derive(Default)]
pub struct Trays(pub Mutex<Vec<String>>);

pub fn visible(state: &DesktopState) -> Vec<(&Account, Option<usize>)> {
    let accounts: Vec<_> = state.accounts.iter().filter(|a| a.enabled && a.tray).collect();
    let mut total = HashMap::new(); let mut index = HashMap::new();
    for a in &accounts { *total.entry(&a.family).or_insert(0) += 1; }
    accounts.into_iter().map(|a| {
        let n = index.entry(&a.family).or_insert(0); *n += 1;
        (a, if total[&a.family] > 1 { Some(*n) } else { None })
    }).collect()
}

pub fn update(app: &tauri::AppHandle, state: &DesktopState) -> tauri::Result<()> {
    let manager = app.state::<Trays>();
    let mut old = manager.0.lock().unwrap();
    let visible = visible(state);
    let ids: Vec<_> = visible.iter().map(|(a,_)| format!("account-{}", a.id)).collect();
    // Recreate on reorder so creation order matches settings (the OS may still reorder its tray).
    if *old != ids {
        for id in old.drain(..) { app.remove_tray_by_id(&id); }
    }
    let dark = match state.settings.appearance.as_str() { "dark" => true, "light" => false, _ => app.get_webview_window("main").and_then(|w| w.theme().ok()) == Some(tauri::Theme::Dark) };
    for (account, badge) in visible {
        let id = format!("account-{}", account.id);
        let image = render(account, badge, &state.settings.tray_style, dark);
        let readings = account.metrics.iter().filter(|m| m.pinned && m.has_data).take(2)
            .map(|m| m.percent.map(|v| format!("{}: {:.0}%", m.label, v)).unwrap_or_else(|| format!("{}: {}", m.label, m.amount.map(|v| v.to_string()).unwrap_or_else(|| "—".into())))).collect::<Vec<_>>().join(" · ");
        let tooltip = format!("{} {} {}\n{}", account.name, account.email, account.plan, readings);
        if let Some(tray) = app.tray_by_id(&id) { tray.set_icon(Some(image))?; tray.set_tooltip(Some(&tooltip))?; tray.set_menu(Some(menu(app, if state.settings.language == "system" { &state.settings.locale } else { &state.settings.language })?))?; }
        else {
            TrayIconBuilder::with_id(&id).icon(image).tooltip(&tooltip)
                .icon_as_template(cfg!(target_os="macos"))
                .show_menu_on_left_click(false).menu(&menu(app, if state.settings.language == "system" { &state.settings.locale } else { &state.settings.language })?)
                .on_menu_event(|app,event| if event.id.as_ref()=="quit" { app.exit(0) } else { crate::show(app) })
                .on_tray_icon_event(|tray,event| if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, position, .. } = event {
                    crate::show_near(tray.app_handle(), position.x as i32, position.y as i32);
                }).build(app)?;
        }
    }
    if let Some(root) = app.tray_by_id("root") { root.set_menu(Some(menu(app, if state.settings.language == "system" { &state.settings.locale } else { &state.settings.language })?))?; root.set_visible(ids.is_empty())?; }
    *old = ids;
    Ok(())
}

pub fn menu(app: &tauri::AppHandle, language: &str) -> tauri::Result<Menu<tauri::Wry>> {
    let label = quit_label(language);
    Menu::with_items(app, &[&MenuItem::with_id(app,"open","TokenPlan",true,None::<&str>)?, &MenuItem::with_id(app,"quit",label,true,None::<&str>)?])
}

pub fn quit_label(language:&str) -> &'static str {
    let language = language.replace('_', "-");
    let normalized = if language.starts_with("zh") { if language.contains("Hant") || language.contains("TW") || language.contains("HK") { "zh-Hant" } else { "zh-Hans" } } else { language.split('-').next().unwrap_or("en") };
    match normalized { "zh-Hans"=>"退出 TokenPlan", "zh-Hant"=>"結束 TokenPlan", "ja"=>"TokenPlan を終了", "ko"=>"TokenPlan 종료", _=>"Quit TokenPlan" }
}

fn logo(family: &str) -> &'static str {
    macro_rules! svg { ($name:literal) => { include_str!(concat!("../icons/providers/",$name,".svg")) }; }
    match family {
        "claude"=>svg!("claude"), "codex"=>svg!("codex"), "cursor"=>svg!("cursor"), "antigravity"=>svg!("antigravity"),
        "amp"=>svg!("amp"), "copilot"=>svg!("copilot"), "deepseek"=>svg!("deepseek"), "devin"=>svg!("devin"), "grok"=>svg!("grok"),
        "moonshot"=>svg!("moonshot"), "minimax"=>svg!("minimax"), "ollama"=>svg!("ollama"), "opencode"=>svg!("opencode"),
        "openrouter"=>svg!("openrouter"), "siliconflow"=>svg!("siliconflow"), "zai"=>svg!("zai"), _=>svg!("tokenplan")
    }
}

pub fn render(account: &Account, badge: Option<usize>, style: &str, dark: bool) -> Image<'static> {
    render_with_width(account, badge, style, dark, style=="percentage" && cfg!(target_os="macos"))
}

fn render_with_width(account: &Account, badge: Option<usize>, style: &str, dark: bool, wide: bool) -> Image<'static> {
    let width = if wide { 84 } else { 40 };
    let mut pixmap = tiny_skia::Pixmap::new(width,40).unwrap();
    if style!="percentage" || wide || account.metrics.iter().all(|m| !m.pinned) { if let Ok(tree) = usvg::Tree::from_str(logo(&account.family), &usvg::Options::default()) {
        let size = tree.size();
        let scale = 20.0 / size.width().max(size.height());
        let transform = tiny_skia::Transform::from_scale(scale,scale).post_translate(if wide {0.0} else {10.0},10.0);
        resvg::render(&tree, transform, &mut pixmap.as_mut());
    }}
    let ink = if dark && !cfg!(target_os="macos") {255} else {0};
    for y in 0..40 { for x in 0..width {
        let alpha = pixmap.data()[((y*width+x)*4+3) as usize];
        if alpha > 0 { pixel(&mut pixmap,x,y,ink,alpha); }
    }}
    let readings: Vec<_> = account.metrics.iter().filter(|m| m.pinned).take(2).collect();
    for (i,m) in readings.iter().enumerate() {
        if style=="percentage" {
            let text = if m.has_data { m.percent.map(|v| format!("{:.0}%", v.clamp(0.0,999.0))).or_else(|| m.amount.map(|v| if v>=1000.0 {format!("{:.0}k",v/1000.0)} else {format!("{:.0}",v)})).unwrap_or_else(|| "-".into()) } else {"-".into()};
            let text = if wide { text } else { text.replace('%', "") };
            draw_text(&mut pixmap,&text,if wide {26} else {3}, if i==0 {3} else {23},ink,2);
        } else {
            let percent = if m.has_data { m.percent.map(|p| p.clamp(0.0,100.0)/100.0) } else {None};
            let radius = 18.0 - i as f64*3.5;
            for y in 0..40 { for x in 0..40 {
                let dx=x as f64-19.5; let dy=y as f64-19.5;
                if ((dx*dx+dy*dy).sqrt()-radius).abs()<1.1 {
                    let angle=(dy.atan2(dx)+std::f64::consts::FRAC_PI_2).rem_euclid(std::f64::consts::TAU)/std::f64::consts::TAU;
                    pixel(&mut pixmap,x,y,ink,if percent.is_some_and(|p| angle<p) {255} else {65});
                }
            }}
        }
    }
    if let Some(n)=badge { draw_text(&mut pixmap,&n.to_string(),if style=="percentage" && !wide {34} else {0},if style=="percentage" && !wide {16} else {0},ink,1); }
    // tiny-skia stores premultiplied RGBA; tray images expect straight alpha.
    let bytes = pixmap.pixels().iter().flat_map(|p| { let p = p.demultiply(); [p.red(),p.green(),p.blue(),p.alpha()] }).collect();
    Image::new_owned(bytes,width,40)
}
fn pixel(p: &mut tiny_skia::Pixmap,x:u32,y:u32,c:u8,a:u8) {
    if x>=p.width() || y>=p.height(){return;} let offset=((y*p.width()+x)*4) as usize;
    let c = (c as u16 * a as u16 / 255) as u8;
    p.data_mut()[offset..offset+4].copy_from_slice(&[c,c,c,a]);
}
fn draw_text(p:&mut tiny_skia::Pixmap,text:&str,x:u32,y:u32,c:u8,scale:u32) {
    for (i,ch) in text.chars().take(5).enumerate() {
        let pattern = match ch {
            '0'=>[14,17,19,21,25,17,14], '1'=>[4,12,4,4,4,4,14], '2'=>[14,17,1,2,4,8,31], '3'=>[30,1,1,14,1,1,30],
            '4'=>[2,6,10,18,31,2,2], '5'=>[31,16,16,30,1,1,30], '6'=>[14,16,16,30,17,17,14], '7'=>[31,1,2,4,8,8,8],
            '8'=>[14,17,17,14,17,17,14], '9'=>[14,17,17,15,1,1,14], '%'=>[25,26,2,4,8,11,19], 'k'=>[16,16,18,20,24,20,18], _=>[0,0,0,31,0,0,0]
        };
        for (row,bits) in pattern.iter().enumerate() { for col in 0..5 { if bits & (1<<(4-col)) != 0 {for sy in 0..scale { for sx in 0..scale { pixel(p,x+(i as u32*6+col)*scale+sx,y+row as u32*scale+sy,c,255); }}} } }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> DesktopState { serde_json::from_str(include_str!("../../tests/fixtures/desktop.json")).unwrap() }
    #[test]
    fn visible_accounts_are_contiguous_in_both_styles() {
        let mut s=fixture(); s.accounts[0].enabled=false;
        assert_eq!(visible(&s).iter().map(|(_,n)|*n).collect::<Vec<_>>(),vec![None,None]);
        s.accounts[0].enabled=true;
        for style in ["ring","percentage"] {
            s.settings.tray_style=style.into();
            assert_eq!(visible(&s).iter().map(|(_,n)|*n).collect::<Vec<_>>(),vec![Some(1),Some(2),None]);
        }
    }
    #[test]
    fn unpinned_accounts_keep_an_icon_in_square_and_wide_percentage_trays() {
        let mut state=fixture();
        for metric in &mut state.accounts[0].metrics { metric.pinned=false; }
        for wide in [false,true] {
            let icon=render_with_width(&state.accounts[0],None,"percentage",false,wide);
            assert!(icon.rgba().chunks_exact(4).any(|p| p[3]>0), "No pins must not create an invisible account icon");
        }
    }
    #[test]
    fn both_modes_render_transparent_rgba_at_the_same_height() {
        let s=fixture();
        for style in ["ring","percentage"] { for dark in [false,true] {
            let image=render(&s.accounts[0],Some(1),style,dark);
            assert_eq!(image.height(),40);
            assert_eq!(image.rgba().len(),image.width() as usize*160);
            assert!(image.rgba().chunks_exact(4).any(|p|p[3]==0));
            assert!(image.rgba().chunks_exact(4).any(|p|p[3]>0));
        }}
    }
}
