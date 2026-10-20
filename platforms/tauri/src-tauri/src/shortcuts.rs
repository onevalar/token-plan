use std::sync::Mutex;
use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, Modifiers};
#[derive(Default)]
pub struct Binding(pub Mutex<BindingState>);
#[derive(Default)]
pub struct BindingState { value:String, paused:bool }
pub fn available(app:&tauri::AppHandle)->bool {
    // The upstream hotkey backend is X11-only. An XWayland connection is not a system-wide grab.
    #[cfg(target_os="linux")]
    if std::env::var("XDG_SESSION_TYPE").as_deref()==Ok("wayland") || std::env::var_os("WAYLAND_DISPLAY").is_some(){return false}
    app.try_state::<tauri_plugin_global_shortcut::GlobalShortcut<tauri::Wry>>().is_some()
}
fn parse(value: &str) -> Result<Shortcut,String> {
    if value.len()>100 { return Err("shortcut_failed".into()); }
    let shortcut:Shortcut=value.parse().map_err(|_|"shortcut_failed")?;
    if !shortcut.mods.intersects(Modifiers::CONTROL|Modifiers::ALT|Modifiers::SUPER) { return Err("shortcut_failed".into()); }
    Ok(shortcut)
}
pub fn apply(app:&tauri::AppHandle,value:&str)->Result<(),String> {
    let binding=app.state::<Binding>();let mut old=binding.0.lock().map_err(|_|"shortcut_failed")?;
    if old.value==value {return Ok(())}
    if !available(app) {if value.is_empty(){old.value.clear();return Ok(())}return Err("shortcut_failed".into());}
    // Register first: conflicts leave the previous working shortcut intact.
    if !value.is_empty() { app.global_shortcut().register(parse(value)?).map_err(|_|"shortcut_failed")?; }
    if !old.paused && !old.value.is_empty() {
        if app.global_shortcut().unregister(parse(&old.value)?).is_err() {
            if !value.is_empty() {let _=app.global_shortcut().unregister(parse(value)?);}
            return Err("shortcut_failed".into())
        }
    }
    if old.paused && !value.is_empty() { app.global_shortcut().unregister(parse(value)?).map_err(|_|"shortcut_failed")?; }
    old.value=value.into();Ok(())
}
pub fn restore(app:&tauri::AppHandle,value:&str) {
    if apply(app,value).is_err() { let _=app.emit("desktop-error","shortcut_failed"); }
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn modifier_required(){assert!(parse("KeyA").is_err());assert!(parse("Shift+KeyA").is_err());assert!(parse("Control+Shift+KeyA").is_ok());assert!(parse("Super+Space").is_ok());}
}

#[tauri::command]
pub fn shortcut_capture(app:tauri::AppHandle,paused:bool)->Result<(),String> {
    let binding=app.state::<Binding>();let mut state=binding.0.lock().map_err(|_|"shortcut_failed")?;
    if state.paused==paused {return Ok(())}
    if !available(&app) {return Err("shortcut_failed".into());}
    if !state.value.is_empty() {
        let shortcut=parse(&state.value)?;
        if paused {app.global_shortcut().unregister(shortcut)} else {app.global_shortcut().register(shortcut)}.map_err(|_|"shortcut_failed")?;
    }
    state.paused=paused;Ok(())
}
