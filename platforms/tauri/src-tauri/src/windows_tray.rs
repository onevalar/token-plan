use crate::{model::DesktopState,tray};
use tauri::{Manager,Emitter,menu::{Menu,MenuItem}};
use std::{sync::Mutex,time::{Instant,Duration}};

pub struct WindowsTray {clicks:Mutex<tray::Clicks>,clock:Instant}
impl Default for WindowsTray {fn default()->Self{Self{clicks:Mutex::new(Default::default()),clock:Instant::now()}}}
#[link(name="user32")]
extern "system" {fn GetDoubleClickTime()->u32;}
fn interval()->u64 {unsafe{GetDoubleClickTime().max(1) as u64}}
pub fn primary(app:&tauri::AppHandle) {
    let state=app.state::<WindowsTray>();
    let Some(revision)=state.clicks.lock().unwrap().primary(state.clock.elapsed().as_millis() as u64) else{return};
    let handle=app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(interval())).await;
        let state=handle.state::<WindowsTray>();
        if !state.clicks.lock().unwrap().current(revision){return;}
        if let Some(icon)=handle.tray_by_id("root") {
            // Use the tray's own native menu window; Home stays hidden on a single click.
            #[allow(deprecated)]
            if let Err(error)=icon.with_inner_tray_icon(|inner|inner.show_menu()) {
                eprintln!("Tray menu failed: {error}");let _=handle.emit("desktop-error","tray_failed");
            }
        }
    });
}
pub fn double(app:&tauri::AppHandle) {
    let state=app.state::<WindowsTray>();
    state.clicks.lock().unwrap().double(state.clock.elapsed().as_millis() as u64,interval());
    crate::show_home(app);
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
