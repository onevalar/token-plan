use crate::model::{Account, DesktopState};
use std::{collections::HashMap, sync::Mutex};
#[cfg(not(target_os = "linux"))]
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};

/// The last image given to the single tray item; identical refreshes skip the
/// native icon update so the menu bar does not redraw every few seconds.
#[derive(Default)]
#[cfg_attr(not(target_os = "macos"), allow(dead_code))]
pub struct Trays(pub Mutex<Option<Vec<u8>>>);

pub fn visible(state: &DesktopState) -> Vec<(&Account, Option<usize>)> {
    let accounts: Vec<_> = state.accounts.iter().filter(|a| a.enabled && a.tray).collect();
    let mut total = HashMap::new(); let mut index = HashMap::new();
    for a in &accounts { *total.entry(&a.family).or_insert(0) += 1; }
    accounts.into_iter().map(|a| {
        let n = index.entry(&a.family).or_insert(0); *n += 1;
        (a, if total[&a.family] > 1 { Some(*n) } else { None })
    }).collect()
}

/// One line per selected account, for the tooltip and the tray menu.
pub fn summaries(state: &DesktopState) -> Vec<String> {
    visible(state).into_iter().map(|(account, badge)| {
        let readings = account.metrics.iter().filter(|m| m.pinned && m.has_data).take(3)
            .map(|m| m.percent.map(|v| format!("{} {:.0}%", m.label, v)).unwrap_or_else(|| format!("{} {}", m.label, m.amount.map(|v| v.to_string()).unwrap_or_else(|| "—".into()))))
            .collect::<Vec<_>>().join(" · ");
        let name = match badge { Some(n) => format!("{} {}", account.name, n), None => account.name.clone() };
        if readings.is_empty() { name } else { format!("{name}: {readings}") }
    }).collect()
}

pub fn language(state: &DesktopState) -> &str {
    if state.settings.language == "system" { &state.settings.locale } else { &state.settings.language }
}

/// macOS keeps the wide template-image strip; other platforms use square native cells.
#[cfg(target_os = "macos")]
pub fn update(app: &tauri::AppHandle, state: &DesktopState) -> tauri::Result<()> {
    let Some(tray) = app.tray_by_id("root") else { return Ok(()) };
    let lines = summaries(state);
    let tooltip = std::iter::once("TokenPlan".to_string()).chain(lines.iter().cloned()).collect::<Vec<_>>().join("\n");
    tray.set_tooltip(Some(&tooltip))?;
    tray.set_menu(Some(menu(app, language(state), &lines)?))?;
    #[cfg(target_os = "macos")]
    {
        use tauri::Manager;
        let image = crate::tray_image::strip(state);
        let trays = app.state::<Trays>();
        let mut last = trays.0.lock().unwrap();
        if last.as_deref() != Some(image.rgba()) {
            *last = Some(image.rgba().to_vec());
            // set_icon() clears NSImage's template flag on macOS. Preserve it atomically,
            // otherwise black pixels disappear on a dark menu bar.
            tray.set_icon_with_as_template(Some(image), true)?;
        }
        // Exercise the native NSImage state in development runs.
        #[cfg(debug_assertions)]
        {
            #[allow(deprecated)]
            let template = tray.with_inner_tray_icon(|inner|
                inner.ns_status_item().and_then(|item| item.image())
                    .is_some_and(|image| image.isTemplate()))?;
            debug_assert!(template, "Menu-bar refresh lost the native template image flag");
        }
    }
    Ok(())
}

#[cfg(target_os = "windows")]
pub fn update(app: &tauri::AppHandle, state: &DesktopState) -> tauri::Result<()> {
    crate::windows_tray::update(app,state)
}

#[cfg(not(target_os = "linux"))]
pub fn menu(app: &tauri::AppHandle, language: &str, lines: &[String]) -> tauri::Result<Menu<tauri::Wry>> {
    let menu = Menu::with_items(app, &[&MenuItem::with_id(app, "open", "TokenPlan", true, None::<&str>)?])?;
    for (i, line) in lines.iter().enumerate() {
        menu.append(&MenuItem::with_id(app, format!("reading-{i}"), line, false, None::<&str>)?)?;
    }
    if !lines.is_empty() { menu.append(&PredefinedMenuItem::separator(app)?)?; }
    menu.append(&MenuItem::with_id(app, "quit", quit_label(language), true, None::<&str>)?)?;
    Ok(menu)
}

pub fn quit_label(language:&str) -> &'static str {
    let language = language.replace('_', "-");
    let normalized = if language.starts_with("zh") { if language.contains("Hant") || language.contains("TW") || language.contains("HK") { "zh-Hant" } else { "zh-Hans" } } else { language.split('-').next().unwrap_or("en") };
    match normalized { "zh-Hans"=>"退出 TokenPlan", "zh-Hant"=>"結束 TokenPlan", "ja"=>"TokenPlan を終了", "ko"=>"TokenPlan 종료", _=>"Quit TokenPlan" }
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
    fn summaries_follow_the_strip_order() {
        let s=fixture();
        let lines=summaries(&s);
        assert_eq!(lines.len(),visible(&s).len());
        assert!(lines[0].starts_with(&format!("{} 1",s.accounts[0].name)));
    }
}
