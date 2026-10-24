#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bridge;
mod account_setup;
mod account_records;
mod links;
mod shortcuts;
mod notifications;
mod model;
mod tray;
mod tray_image;
#[cfg(any(target_os="windows",test))]
mod windows_tray;
mod panel;
#[cfg(any(target_os="macos",test))]
mod mac_panel;
#[cfg(target_os="linux")]
mod linux_tray;
use tauri::Manager;
#[cfg(not(target_os="linux"))]
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};

fn show_home(app:&tauri::AppHandle) {
    let _=tauri::Emitter::emit(app,"show-home",());
    panel::show(app);
}

fn show_home_at(app:&tauri::AppHandle,anchor:Option<(i32,i32,i32)>) {
    let _=tauri::Emitter::emit(app,"show-home",());
    panel::show_at(app,anchor);
}

fn show(app: &tauri::AppHandle) {
    panel::show(app);
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
    let builder=tauri::Builder::default();
    #[cfg(target_os="macos")]
    let builder=builder.plugin(tauri_nspanel::init());
    builder
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show(app)))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(shortcuts::Binding::default())
        .manage(notifications::Alerts::default())
        .manage(bridge::Bridge::default())
        .manage(tray::Trays::default())
        .manage(panel::Panel::default())
        .manage(account_setup::AccountSetup::default())
        .invoke_handler(tauri::generate_handler![bridge::desktop_request, shortcuts::shortcut_capture, panel::panel_frame, panel::panel_content_height, account_setup::account_login, account_setup::account_setups, account_setup::account_setup_create, account_setup::account_setup_remove, account_setup::account_directory, links::open_link, quit, hide])
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
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                if let Some(window)=app.get_webview_window("main") {panel::make_menu_bar_panel(&window)?;}
                // The menu-bar panel starts closed. Otherwise the window counts as visible
                // without being drawn, and the first menu-bar click only hides it.
                panel::hide(app.handle());
            }
            // Linux uses a single StatusNotifier item from linux_tray instead.
            #[cfg(not(target_os="linux"))]
            {
                let open = MenuItem::with_id(app, "open", if cfg!(target_os="macos"){"TokenPlan"}else{tray::open_label("en")}, true, None::<&str>)?;
                let quit = MenuItem::with_id(app, "quit", "Quit TokenPlan", true, None::<&str>)?;
                let menu = Menu::with_items(app, &[&open, &quit])?;
                TrayIconBuilder::with_id("root")
                    .icon({
                        #[cfg(target_os="windows")] {tray::application_icon()?}
                        #[cfg(target_os="macos")] {tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?}
                    })
                    .tooltip(app.config().product_name.as_deref().unwrap_or("TokenPlan"))
                    .menu(&menu)
                    .show_menu_on_left_click(false)
                    .on_menu_event(|app, event| match event.id.as_ref() {
                        "open" => {
                            #[cfg(target_os="macos")] show(app);
                            #[cfg(target_os="windows")] windows_tray::open_home(app);
                        },
                        "quit" => app.exit(0),
                        _ => {}
                    })
                    .on_tray_icon_event(|tray, event| {
                        #[cfg(target_os="windows")]
                        if let Some(anchor)=tray::primary_anchor(&event) {
                            // Right-click keeps the native menu. Repeated left-clicks only show Home.
                            show_home_at(tray.app_handle(),Some(anchor));
                        }
                        #[cfg(target_os="macos")]
                        if let TrayIconEvent::Click {
                                button: MouseButton::Left,
                                button_state: MouseButtonState::Up,
                                ..
                            } = event {
                            mac_panel::toggle(tray.app_handle());
                        }
                    })
                    .build(app)?;
            }
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
