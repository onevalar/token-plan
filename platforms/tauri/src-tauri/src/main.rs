#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bridge;
mod shortcuts;
mod notifications;
mod model;
mod tray;
mod panel;
#[cfg(target_os="linux")]
mod linux_tray;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

fn show(app: &tauri::AppHandle) {
    panel::show(app);
}

fn show_near(app:&tauri::AppHandle,x:i32,y:i32) {
    panel::toggle_near(app,x,y);
}

#[tauri::command]
fn hide(app: tauri::AppHandle) {
    panel::hide(&app);
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
        .manage(shortcuts::Binding::default())
        .manage(notifications::Alerts::default())
        .manage(bridge::Bridge::default())
        .manage(tray::Trays::default())
        .manage(panel::Panel::default())
        .invoke_handler(tauri::generate_handler![bridge::desktop_request, shortcuts::shortcut_capture, quit, hide])
        .setup(|app| {
            // A missing global-hotkey backend (e.g. a Wayland-only session) must not prevent startup.
            if app.handle().plugin(tauri_plugin_global_shortcut::Builder::new().with_handler(|app,_,event| {
                if event.state()==tauri_plugin_global_shortcut::ShortcutState::Pressed {
                    if let Some(window)=app.get_webview_window("main") {if window.is_visible().unwrap_or(false){panel::hide(app);}else{show(app);}}
                }
            }).build()).is_err(){eprintln!("Global shortcuts unavailable in this desktop session");}

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
                .tooltip(app.config().product_name.as_deref().unwrap_or("TokenPlan"))
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            position,
                            ..
                        } = event {
                        show_near(tray.app_handle(),position.x as i32,position.y as i32);
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
            if let tauri::WindowEvent::Focused(focused)=event {
                panel::focus_changed(window.app_handle(),*focused);
            }
            if let tauri::WindowEvent::ThemeChanged(_) = event {
                tauri::async_runtime::spawn(bridge::redraw_trays(window.app_handle().clone()));
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                panel::hide(window.app_handle());
                api.prevent_close();
            }
        })
        .build(tauri::generate_context!())
        .expect("TokenPlan desktop runtime failed")
        .run(|app,event| {
            #[cfg(target_os="macos")]
            if let tauri::RunEvent::Reopen {..}=event {show(app);}
            #[cfg(not(target_os="macos"))]
            let _=(app,event);
        });
}

#[cfg(test)]
mod update_tests;
