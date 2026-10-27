use std::sync::atomic::{AtomicBool, AtomicU64, AtomicU32, Ordering};
use tauri::{Emitter, Manager};

#[derive(Default)]
pub struct Panel {
    revision: AtomicU64,
    persistent: AtomicBool,
    pub(super) content_height: AtomicU32,
    #[cfg(target_os="macos")]
    pub(super) mac_anchor: std::sync::Mutex<Option<(f64,f64)>>,
    center_on_resize: AtomicBool,
    anchor: std::sync::Mutex<Option<(i32,i32,i32)>>,
}
impl Panel {
    #[cfg(any(target_os="linux",test))]
    pub(super) fn outside_revision(&self)->u64 {self.revision.load(Ordering::SeqCst)}
    #[cfg(any(target_os="linux",test))]
    pub(super) fn allows_outside_dismissal(&self,revision:u64)->bool {self.can_dismiss(revision,false)}
    fn changed(&self) -> u64 { self.revision.fetch_add(1,Ordering::SeqCst)+1 }
    fn set_persistent(&self, persistent:bool) -> bool {
        let changed=self.persistent.swap(persistent,Ordering::SeqCst)!=persistent;
        if changed {self.changed();}
        changed
    }
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
        checked(app,window.set_always_on_top(!app.state::<Panel>().persistent.load(Ordering::SeqCst)));
        checked(app,window.show());
        checked(app,window.unminimize());
        checked(app,window.set_focus());
        #[cfg(target_os="linux")]
        crate::linux_outside::watch(app,!app.state::<Panel>().persistent.load(Ordering::SeqCst));
    }
}
pub fn hide(app:&tauri::AppHandle) {
    #[cfg(target_os="linux")]
    crate::linux_outside::watch(app,false);
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
        #[cfg(target_os="linux")]
        {
            let ui=handle.clone();
            checked(&handle,handle.run_on_main_thread(move||{
                use gtk::prelude::*;
                if let Some(window)=ui.get_webview_window("main") {
                    let focused=window.gtk_window().map(|native|native.is_active()).unwrap_or(true);
                    if ui.state::<Panel>().can_dismiss(revision,focused) {hide(&ui);}
                }
            }));
        }
        #[cfg(not(target_os="linux"))]
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
/// Explicit show is idempotent: a second click never hides the newly opened page.
/// No usable tray coordinates: center on the window's current monitor (or primary).
pub fn show_at(app:&tauri::AppHandle,requested:Option<(i32,i32,i32)>) {
    if let Some(window)=app.get_webview_window("main") {
        // Tray event rectangles use physical pixels. Match bounds rather than the
        // macOS monitor_from_point API, which expects logical points there.
        let matched=requested.and_then(|(center,top,_)|app.available_monitors().unwrap_or_default().into_iter().find(|monitor|{
            let (origin,size)=(monitor.position(),monitor.size());
            (origin.x..origin.x+size.width as i32).contains(&center) && (origin.y..origin.y+size.height as i32).contains(&top)
        }));
        let anchor=if matched.is_some(){requested}else{None};
        *app.state::<Panel>().anchor.lock().unwrap()=anchor;
        app.state::<Panel>().center_on_resize.store(anchor.is_none(),Ordering::SeqCst);
        let monitor=matched.or_else(||window.current_monitor().ok().flatten()).or_else(||app.primary_monitor().ok().flatten());
        if let Some(monitor)=monitor {
            let area=monitor.work_area();let scale=monitor.scale_factor();
            let width=((390.0*scale).round() as u32).min(area.size.width);
            let desired=app.state::<Panel>().content_height.load(Ordering::SeqCst);
            let height=bounded_height(if desired==0 {280.} else {desired as f64},scale,area.size.height);
            checked(app,window.set_size(tauri::PhysicalSize::new(width,height)));
            let (x,y)=show_placement(anchor,(area.position.x,area.position.y),(area.size.width,area.size.height),(width,height),(6.0*scale) as i32);
            checked(app,window.set_position(tauri::PhysicalPosition::new(x,y)));
        }
    }
    show(app);
}
fn show_placement(anchor:Option<(i32,i32,i32)>,origin:(i32,i32),area:(u32,u32),size:(u32,u32),gap:i32)->(i32,i32) {
    match anchor {
        Some(anchor)=>placement(anchor,origin,area,size,gap),
        None=>(origin.0+area.0.saturating_sub(size.0) as i32/2,origin.1+area.1.saturating_sub(size.1) as i32/2),
    }
}

fn bounded_height(content:f64,scale:f64,available:u32)->u32 {
    ((content.clamp(120.,680.)*scale).ceil() as u32).min(available.saturating_sub((12.*scale).ceil() as u32).max(1))
}

#[tauri::command]
pub fn panel_content_height(app:tauri::AppHandle,height:f64)->Result<(),String> {
    if !height.is_finite() || !(0. ..=100000.).contains(&height) {return Err("invalid_height".into());}
    let panel=app.state::<Panel>();
    let value=height.ceil() as u32;
    let previous=panel.content_height.swap(value,Ordering::SeqCst);
    if previous==value || panel.persistent.load(Ordering::SeqCst) {return Ok(());}
    #[cfg(target_os="macos")]
    return crate::mac_panel::resize(&app);
    #[cfg(not(target_os="macos"))]
    {
    let window=app.get_webview_window("main").ok_or("window_unavailable")?;
    let monitor=window.current_monitor().map_err(|e|e.to_string())?;
    if let Some(monitor)=monitor {
        let area=monitor.work_area();let scale=monitor.scale_factor();
        let size=tauri::PhysicalSize::new(((390.*scale).round() as u32).min(area.size.width),bounded_height(height,scale,area.size.height));
        window.set_size(size).map_err(|e|e.to_string())?;
        let anchor=*panel.anchor.lock().unwrap();
        if anchor.is_some() || panel.center_on_resize.load(Ordering::SeqCst) {
            let (x,y)=show_placement(anchor,(area.position.x,area.position.y),(area.size.width,area.size.height),(size.width,size.height),(6.*scale) as i32);
            window.set_position(tauri::PhysicalPosition::new(x,y)).map_err(|e|e.to_string())?;
        }
    }
    Ok(())
    }
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

/// GTK reports activation at the toplevel, including desktop/shell focus changes.
/// Keep all GTK access on its main thread (SNI callbacks run on the async runtime).
#[cfg(target_os="linux")]
pub fn observe_linux_focus(app:&tauri::AppHandle) {
    use gtk::prelude::*;
    if let Some(window)=app.get_webview_window("main") {
        if let Ok(native)=window.gtk_window() {
            let handle=app.clone();
            native.connect_is_active_notify(move|window|focus_changed(&handle,window.is_active()));
            crate::linux_outside::watch(app,native.is_visible());
        }
    }
}

#[cfg(target_os="linux")]
pub fn linux_tray_available(app:&tauri::AppHandle,available:bool) {
    let handle=app.clone();
    checked(app,app.run_on_main_thread(move||{
        let panel=handle.state::<Panel>();
        if !panel.set_persistent(!available) {return;}
        if let Some(window)=handle.get_webview_window("main") {
            checked(&handle,window.set_decorations(!available));
            checked(&handle,window.set_resizable(!available));
            checked(&handle,window.set_minimizable(!available));
            checked(&handle,window.set_skip_taskbar(available));
            checked(&handle,window.set_always_on_top(available));
            let _=handle.emit("panel-frame",frame(&handle));
            crate::linux_outside::watch(&handle,available && window.is_visible().unwrap_or(false));
            if available {
                // Recover popup semantics without stealing focus or opening Home.
                if window.is_visible().unwrap_or(false) {
                    focus_changed(&handle,window.is_focused().unwrap_or(true));
                }
            } else {
                // Keep an accessible window if the desktop removes the tray host.
                show(&handle);
            }
        }
    }));
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn content_height_shrinks_grows_and_respects_screen_scale() {
        assert_eq!(bounded_height(210.,2.,1800),420);
        assert_eq!(bounded_height(2000.,2.,1800),1360);
        assert_eq!(bounded_height(600.,2.,700),676);
        assert_eq!(bounded_height(20.,1.,900),120);
    }
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
    #[test] fn outside_press_cannot_close_a_newly_reopened_or_persistent_window() {
        let state=Panel::default();
        let press=state.outside_revision();
        assert!(state.allows_outside_dismissal(press));
        state.changed();
        assert!(!state.allows_outside_dismissal(press));
        state.set_persistent(true);
        assert!(!state.allows_outside_dismissal(state.outside_revision()));
    }
    #[test] fn tray_recovery_restores_dismissal_and_invalidates_pending_blur() {
        let state=Panel::default();
        let before=state.changed();
        assert!(state.set_persistent(true));
        assert!(!state.can_dismiss(before,false));
        assert!(!state.set_persistent(true));
        assert!(state.set_persistent(false));
        assert!(!state.can_dismiss(before,false));
        let after=state.changed();
        assert!(state.can_dismiss(after,false));
        assert!(!state.set_persistent(false));
        assert!(state.can_dismiss(after,false));
    }
    #[test] fn explicit_show_uses_monitor_center_without_a_tray_location() {
        assert_eq!(show_placement(None,(-1920,24),(1920,1056),(390,280),6),(-1155,412));
        assert_eq!(show_placement(None,(-1920,24),(1920,1056),(390,680),6),(-1155,212));
        // 200% scaling, lower taskbar, and a secondary display to the right.
        assert_eq!(show_placement(Some((3700,2090,2160)),(1920,0),(1920,2080),(780,1360),12),(3048,708));
        assert_eq!(show_placement(None,(0,0),(320,200),(320,188),6),(0,6));
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
