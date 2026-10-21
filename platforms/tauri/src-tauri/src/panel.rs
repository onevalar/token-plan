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
#[cfg(target_os="macos")]
tauri_nspanel::tauri_panel! {
    panel!(TrayPanel {
        config: {
            can_become_key_window: true,
            is_floating_panel: true
        }
    })
}

/// Turns the main window into a non-activating panel, like the native menu-bar panel, so it
/// opens over another app's full-screen Space while still taking keyboard input.
#[cfg(target_os="macos")]
pub fn make_menu_bar_panel(window:&tauri::WebviewWindow)->Result<(),Box<dyn std::error::Error>> {
    use tauri_nspanel::{CollectionBehavior,PanelLevel,StyleMask,WebviewWindowExt};
    let panel=window.to_panel::<TrayPanel>()?;
    panel.set_level(PanelLevel::PopUpMenu.value());
    panel.add_style_mask(StyleMask::empty().nonactivating_panel().into())?;
    panel.set_collection_behavior(CollectionBehavior::new().can_join_all_spaces().full_screen_auxiliary().into());
    Ok(())
}

pub fn show(app:&tauri::AppHandle) {
    app.state::<Panel>().changed();
    // Ordering a panel front does not activate the app, so it stays over a full-screen
    // Space. AppKit calls must run on the main thread.
    #[cfg(target_os="macos")]
    {
        let handle=app.clone();
        checked(app,app.run_on_main_thread(move||{
            use tauri_nspanel::ManagerExt;
            if let Ok(panel)=handle.get_webview_panel("main") {
                // Keep the web view as first responder; resetting it focuses the first button.
                panel.order_front_regardless();
                panel.make_key_window();
            }
        }));
    }
    #[cfg(not(target_os="macos"))]
    if let Some(window)=app.get_webview_window("main") {
        checked(app,window.show());
        checked(app,window.unminimize());
        checked(app,window.set_focus());
    }
}
pub fn hide(app:&tauri::AppHandle) {
    app.state::<Panel>().changed();
    #[cfg(target_os="macos")]
    {
        let handle=app.clone();
        checked(app,app.run_on_main_thread(move||{
            use tauri_nspanel::ManagerExt;
            if let Ok(panel)=handle.get_webview_panel("main") {panel.hide();}
        }));
    }
    #[cfg(not(target_os="macos"))]
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

/// Places the panel centered under (or above) the clicked tray icon, inside the
/// work area. `anchor` is the icon's center x plus its top and bottom edges; when
/// a tray host only reports a click point, top and bottom are that point.
fn placement(anchor:(i32,i32,i32),origin:(i32,i32),area:(u32,u32),size:(u32,u32),gap:i32)->(i32,i32) {
    let (center,top,bottom)=anchor;
    let left_edge=origin.0+gap;
    let right_edge=(origin.0+area.0 as i32-size.0 as i32-gap).max(left_edge);
    let x=(center-size.0 as i32/2).clamp(left_edge,right_edge);
    let area_bottom=origin.1+area.1 as i32;
    // Bottom taskbars open upward; top menu bars open downward. The work area
    // already excludes the bar, and the icon edge covers hosts that do not report one.
    let y=if top>origin.1+area.1 as i32/2 {
        (area_bottom-size.1 as i32-gap).min(top-size.1 as i32-gap)
    } else {
        (origin.1+gap).max(bottom+gap)
    };
    (x,y.clamp(origin.1,(area_bottom-size.1 as i32).max(origin.1)))
}
pub fn toggle_near(app:&tauri::AppHandle,center:i32,top:i32,bottom:i32) {
    if let Some(window)=app.get_webview_window("main") {
        if window.is_visible().unwrap_or(false) {hide(app);return;}
        // The clicked monitor may differ from the panel's previous monitor.
        // Tray positions are physical pixels, but macOS looks up `monitor_from_point`
        // in logical points, so match the physical monitor bounds directly.
        let monitor=app.available_monitors().unwrap_or_default().into_iter().find(|monitor|{
            let (origin,size)=(monitor.position(),monitor.size());
            (origin.x..origin.x+size.width as i32).contains(&center) && (origin.y..origin.y+size.height as i32).contains(&top)
        });
        if let Some(monitor)=monitor {
            let area=monitor.work_area();
            let scale=monitor.scale_factor();
            let width=(390.0*scale).round() as u32;
            let height=((680.0*scale).round() as u32).min(area.size.height);
            checked(app,window.set_size(tauri::PhysicalSize::new(width,height)));
            let (x,y)=placement((center,top,bottom),(area.position.x,area.position.y),(area.size.width,area.size.height),(width,height),(6.0*scale) as i32);
            checked(app,window.set_position(tauri::PhysicalPosition::new(x,y)));
        }
    }
    show(app);
}

/// How the web interface should draw the panel's outer frame.
#[derive(serde::Serialize,Clone)]
pub struct Frame { platform:&'static str, rounded:bool }
#[tauri::command]
pub fn panel_frame(app:tauri::AppHandle)->Frame { frame(&app) }
fn frame(app:&tauri::AppHandle)->Frame {
    let platform=if cfg!(target_os="macos") {"macos"} else if cfg!(target_os="windows") {"windows"} else {"linux"};
    // Windows 11 rounds undecorated windows itself. Linux can only show transparent
    // corners under a compositor; otherwise they would render black.
    #[cfg(target_os="linux")]
    let rounded=!app.state::<Panel>().persistent.load(Ordering::SeqCst) && app.get_webview_window("main")
        .and_then(|window|window.gtk_window().ok())
        .is_some_and(|window|{use gtk::prelude::WidgetExt;window.screen().is_some_and(|screen|screen.is_composited())});
    #[cfg(not(target_os="linux"))]
    let rounded={let _=app;cfg!(target_os="macos")};
    Frame{platform,rounded}
}

#[cfg(target_os="linux")]
pub fn retain_window_without_tray(app:&tauri::AppHandle) {
    app.state::<Panel>().persistent.store(true,Ordering::SeqCst);
    let _=app.emit("panel-frame",frame(app));
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
    #[test] fn panel_centers_on_tray_icon_within_the_clicked_monitor() {
        // macOS menu bar: below the bar, centered on the icon.
        assert_eq!(placement((1200,0,24),(0,24),(1920,1056),(390,680),6),(1005,30));
        // Icon near the right edge: kept inside the work area.
        assert_eq!(placement((1900,0,24),(0,24),(1920,1056),(390,680),6),(1524,30));
        // Bottom taskbar: above the bar.
        assert_eq!(placement((1700,1048,1080),(0,0),(1920,1040),(390,680),6),(1505,354));
        // Second monitor to the left.
        assert_eq!(placement((-1900,0,24),(-1920,24),(1920,1056),(390,680),6),(-1914,30));
        // A host that reports only a click point and no reserved bar.
        assert_eq!(placement((600,12,12),(0,0),(1920,1080),(390,680),6),(405,18));
        // Work area smaller than the panel.
        assert_eq!(placement((100,0,24),(0,24),(320,400),(390,680),6),(6,24));
    }
}
