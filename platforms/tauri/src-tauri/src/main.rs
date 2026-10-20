#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bridge;
mod shortcuts;
mod notifications;
mod model;
mod tray;
#[cfg(target_os="linux")]
mod linux_tray;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn show(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn show_near(app:&tauri::AppHandle,x:i32,y:i32) {
    if let Some(window)=app.get_webview_window("main") {
        if let Ok(Some(monitor))=window.current_monitor() {
            let screen=monitor.position();let size=monitor.size();
            let panel=window.outer_size().unwrap_or(tauri::PhysicalSize::new(480,680));
            let x=(x-panel.width as i32+20).clamp(screen.x,(screen.x+size.width as i32-panel.width as i32).max(screen.x));
            let y=(y+12).clamp(screen.y,(screen.y+size.height as i32-panel.height as i32).max(screen.y));
            let _=window.set_position(tauri::PhysicalPosition::new(x,y));
        }
    }
    show(app);
}

#[tauri::command]
fn hide(app: tauri::AppHandle) {
    if let Some(window)=app.get_webview_window("main") { let _=window.hide(); }
}

#[tauri::command]
fn quit(app: tauri::AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show(app)))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app,_,event| {
            if event.state()==tauri_plugin_global_shortcut::ShortcutState::Pressed {
                if let Some(window)=app.get_webview_window("main") {if window.is_visible().unwrap_or(false){let _=window.hide();}else{show(app);}}
            }
        }).build())
        .manage(shortcuts::Binding::default())
        .manage(notifications::Alerts::default())
        .manage(bridge::Bridge::default())
        .manage(tray::Trays::default())
        .invoke_handler(tauri::generate_handler![bridge::desktop_request, quit, hide])
        .setup(|app| {
            #[cfg(target_os="linux")]
            app.manage(linux_tray::LinuxTrays::default());
            #[cfg(target_os="macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);
            let open = MenuItem::with_id(app, "open", "TokenPlan", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit TokenPlan", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            TrayIconBuilder::with_id("root")
                .icon(tauri::image::Image::from_bytes(include_bytes!(
                    "../icons/icon.png"
                ))?)
                .tooltip("TokenPlan Preview")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if matches!(
                        event,
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                    ) {
                        show(tray.app_handle());
                    }
                })
                .build(app)?;
            #[cfg(target_os="macos")]
            {
                let handle=app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    match tokio::signal::unix::signal(tokio::signal::unix::SignalKind::user_defined1()){
                        Ok(mut clicks)=>while clicks.recv().await.is_some(){show(&handle);},
                        Err(_)=>{let _=tauri::Emitter::emit(&handle,"desktop-error","notification_failed");}
                    }
                });
            }
            bridge::start_background(app.handle().clone());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::ThemeChanged(_) = event {
                tauri::async_runtime::spawn(bridge::redraw_trays(window.app_handle().clone()));
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if window.hide().is_ok() {
                    api.prevent_close();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("TokenPlan desktop runtime failed");
}

#[cfg(test)]
mod update_tests;
