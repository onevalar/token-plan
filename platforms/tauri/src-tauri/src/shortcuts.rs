use std::sync::Mutex;
use tauri::{Manager, Emitter};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, Modifiers};
#[derive(Default)]
pub struct Binding(pub Mutex<String>);
fn parse(value: &str) -> Result<Shortcut,String> {
    if value.len()>100 { return Err("shortcut_failed".into()); }
    let shortcut:Shortcut=value.parse().map_err(|_|"shortcut_failed")?;
    if !shortcut.mods.intersects(Modifiers::CONTROL|Modifiers::ALT|Modifiers::SUPER) { return Err("shortcut_failed".into()); }
    Ok(shortcut)
}
pub fn apply(app:&tauri::AppHandle,value:&str)->Result<(),String> {
    let binding=app.state::<Binding>();let mut old=binding.0.lock().map_err(|_|"shortcut_failed")?;
    if *old==value {return Ok(())}
    // Register first: conflicts leave the previous working shortcut intact.
    if !value.is_empty() { app.global_shortcut().register(parse(value)?).map_err(|_|"shortcut_failed")?; }
    if !old.is_empty() {
        if app.global_shortcut().unregister(parse(&old)?).is_err() {
            if !value.is_empty() {let _=app.global_shortcut().unregister(parse(value)?);}
            return Err("shortcut_failed".into())
        }
    }
    *old=value.into();Ok(())
}
pub fn restore(app:&tauri::AppHandle,value:&str) {
    if apply(app,value).is_err() { let _=app.emit("desktop-error","shortcut_failed"); }
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn modifier_required(){assert!(parse("KeyA").is_err());assert!(parse("Shift+KeyA").is_err());assert!(parse("Control+Shift+KeyA").is_ok());assert!(parse("Super+Space").is_ok());}
}
