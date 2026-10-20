use std::sync::atomic::{AtomicBool, AtomicU64, Ordering};
use tauri::{Emitter, Manager};

#[derive(Default)]
pub struct Panel {
    revision: AtomicU64,
    persistent: AtomicBool,
}
impl Panel {
    fn changed(&self) -> u64 { self.revision.fetch_add(1,Ordering::SeqCst)+1 }
    fn can_dismiss(&self, revision:u64, focused:bool) -> bool {
        !focused && !self.persistent.load(Ordering::SeqCst) && self.revision.load(Ordering::SeqCst)==revision
    }
}
fn checked(app:&tauri::AppHandle,result:tauri::Result<()>) {
    if let Err(error)=result {
        eprintln!("Panel operation failed: {error}");
        let _=app.emit("desktop-error","tray_failed");
    }
}
pub fn show(app:&tauri::AppHandle) {
    app.state::<Panel>().changed();
    if let Some(window)=app.get_webview_window("main") {
        checked(app,window.show());
        checked(app,window.unminimize());
        checked(app,window.set_focus());
    }
}
pub fn hide(app:&tauri::AppHandle) {
    app.state::<Panel>().changed();
    if let Some(window)=app.get_webview_window("main") {
        // Without a tray host, keep an entry from which the user can reopen it.
        let result=if app.state::<Panel>().persistent.load(Ordering::SeqCst) {
            window.minimize()
        } else {window.hide()};
        checked(app,result);
    }
}
pub fn focus_changed(app:&tauri::AppHandle,focused:bool) {
    let revision=app.state::<Panel>().changed();
    if focused {return;}
    let handle=app.clone();
    // A tray click can transfer focus before its activation event is delivered.
    // Let that event toggle/cancel this dismissal rather than immediately reopening.
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(std::time::Duration::from_millis(150)).await;
        if let Some(window)=handle.get_webview_window("main") {
            if handle.state::<Panel>().can_dismiss(revision,window.is_focused().unwrap_or(true)) {
                hide(&handle);
            }
        }
    });
}

fn placement(anchor:(i32,i32),origin:(i32,i32),area:(u32,u32),size:(u32,u32),gap:i32)->(i32,i32) {
    let right=(origin.0+area.0 as i32-size.0 as i32).max(origin.0);
    let bottom=(origin.1+area.1 as i32-size.1 as i32).max(origin.1);
    let x=(anchor.0-size.0 as i32+gap).clamp(origin.0,right);
    // Bottom taskbars open upward; top menu bars open downward.
    let y=if anchor.1>origin.1+area.1 as i32/2 {anchor.1-size.1 as i32-gap} else {anchor.1+gap};
    (x,y.clamp(origin.1,bottom))
}
pub fn toggle_near(app:&tauri::AppHandle,x:i32,y:i32) {
    if let Some(window)=app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {hide(app);return;}
        // The clicked monitor may differ from the panel's previous monitor.
        if let Ok(Some(monitor))=app.monitor_from_point(x as f64,y as f64) {
            let area=monitor.work_area();
            let scale=monitor.scale_factor();
            let width=(390.0*scale).round() as u32;
            let height=((680.0*scale).round() as u32).min(area.size.height);
            checked(app,window.set_size(tauri::PhysicalSize::new(width,height)));
            let (x,y)=placement((x,y),(area.position.x,area.position.y),(area.size.width,area.size.height),(width,height),(8.0*scale) as i32);
            checked(app,window.set_position(tauri::PhysicalPosition::new(x,y)));
        }
    }
    show(app);
}

#[cfg(target_os="linux")]
pub fn retain_window_without_tray(app:&tauri::AppHandle) {
    app.state::<Panel>().persistent.store(true,Ordering::SeqCst);
    if let Some(window)=app.get_webview_window("main") {
        checked(app,window.set_decorations(true));
        checked(app,window.set_resizable(true));
        checked(app,window.set_minimizable(true));
        checked(app,window.set_skip_taskbar(false));
        checked(app,window.set_always_on_top(false));
    }
    show(app);
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn pending_blur_cannot_hide_reopened_or_refocused_panel() {
        let state=Panel::default();
        let blur=state.changed();
        assert!(state.can_dismiss(blur,false));
        assert!(!state.can_dismiss(blur,true));
        state.changed();
        assert!(!state.can_dismiss(blur,false));
        let blur=state.changed();
        state.persistent.store(true,Ordering::SeqCst);
        assert!(!state.can_dismiss(blur,false));
    }
    #[test] fn panel_stays_on_clicked_monitor_and_avoids_bottom_taskbar() {
        assert_eq!(placement((1900,24),(0,24),(1920,1056),(390,680),8),(1518,32));
        assert_eq!(placement((1900,1040),(0,0),(1920,1040),(390,680),8),(1518,352));
        assert_eq!(placement((-1900,24),(-1920,24),(1920,1056),(390,680),8),(-1920,32));
        assert_eq!(placement((100,0),(0,24),(320,400),(390,680),8),(0,24));
    }
}
