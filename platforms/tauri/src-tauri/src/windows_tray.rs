use crate::{model::DesktopState,tray};
use tauri::{Manager,menu::{Menu,MenuItem}};

pub fn open_home(app:&tauri::AppHandle) {
    let anchor=app.tray_by_id("root").and_then(|icon|icon.rect().ok().flatten()).and_then(tray::rect_anchor);
    crate::show_home_at(app,anchor);
}

/// Windows has one permanent application icon; quotas belong to the main page.
pub fn update(app:&tauri::AppHandle,state:&DesktopState)->tauri::Result<()> {
    let Some(icon)=app.tray_by_id("root") else {return Ok(())};
    let language=tray::language(state);
    let menu=Menu::with_items(app,&[
        &MenuItem::with_id(app,"open",tray::open_label(language),true,None::<&str>)?,
        &MenuItem::with_id(app,"quit",tray::quit_label(language),true,None::<&str>)?,
    ])?;
    icon.set_menu(Some(menu))?;
    icon.set_tooltip(Some("TokenPlan"))?;
    Ok(())
}
