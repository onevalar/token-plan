//! Explicit, user-initiated login guidance. Credentials stay with the official CLI.
use std::{path::{Path,PathBuf},process::Command,sync::Mutex};
use tauri::Manager;

#[derive(Default)]
pub struct AccountSetup(Mutex<()>);
#[derive(serde::Serialize)]
pub struct LoginGuide { command:String, directory:String, opened:bool }
fn family(value:&str)->Result<(),String> {
    if ["claude","codex"].contains(&value) {Ok(())} else {Err("unsupported_provider".into())}
}
fn quote_sh(value:&str)->String {format!("'{}'",value.replace('\'',"'\"'\"'"))}
fn login_command(provider:&str,path:&Path,windows:bool)->String {
    let variable=if provider=="claude" {"CLAUDE_CONFIG_DIR"} else {"CODEX_HOME"};
    let args=if provider=="claude" {"auth login"} else {"-c 'cli_auth_credentials_store=\"file\"' login"};
    if windows {format!("$env:{variable}='{}'; {provider} {args}",path.to_string_lossy().replace('\'',"''"))}
    else {format!("env {variable}={} {provider} {args}",quote_sh(&path.to_string_lossy()))}
}
fn terminal(command:&str)->bool {
    #[cfg(target_os="macos")]
    {
        let escaped=command.replace('\\',"\\\\").replace('"',"\\\"");
        return Command::new("osascript").args(["-e",&format!("tell application \"Terminal\" to do script \"{escaped}\""),"-e","tell application \"Terminal\" to activate"]).output().is_ok_and(|o|o.status.success());
    }
    #[cfg(target_os="windows")]
    {
        use std::os::windows::process::CommandExt;
        return Command::new("powershell.exe").args(["-NoProfile","-NoExit","-Command",command]).creation_flags(0x00000010).spawn().is_ok();
    }
    #[cfg(target_os="linux")]
    {
        for (program,flag) in [("x-terminal-emulator","-e"),("gnome-terminal","--"),("konsole","-e"),("xterm","-e")] {
            if Command::new(program).args([flag,"sh","-lc",&format!("{command}; printf '\\nPress Enter to close'; read answer")]).spawn().is_ok(){return true;}
        }
        false
    }
}
#[tauri::command]
pub async fn account_login(app:tauri::AppHandle,provider:String)->Result<LoginGuide,String> {
    family(&provider)?;
    tauri::async_runtime::spawn_blocking(move||{
        let state=app.state::<AccountSetup>();let _guard=state.0.lock().unwrap();
        let home=app.path().home_dir().map_err(|e|e.to_string())?;
        // create_dir reserves a unique home; no existing login or configuration is overwritten.
        let stamp=std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).map_err(|e|e.to_string())?.as_nanos();
        let directory=home.join(format!(".{provider}-tokenplan-{stamp}"));
        std::fs::create_dir(&directory).map_err(|e|e.to_string())?;
        #[cfg(unix)] {use std::os::unix::fs::PermissionsExt;std::fs::set_permissions(&directory,std::fs::Permissions::from_mode(0o700)).map_err(|e|e.to_string())?;}
        let command=login_command(&provider,&directory,cfg!(windows));
        let opened=terminal(&command);
        if !opened {eprintln!("Could not open a terminal for account login; showing the command instead");}
        Ok(LoginGuide{command,directory:directory.to_string_lossy().into(),opened})
    }).await.map_err(|e|e.to_string())?
}

/// Only directory paths are registered, never passwords, tokens or copied auth documents.
#[tauri::command]
pub fn account_directory(app:tauri::AppHandle,provider:String,directory:String)->Result<(),String> {
    family(&provider)?;
    let state=app.state::<AccountSetup>();let _guard=state.0.lock().unwrap();
    let path=PathBuf::from(directory.trim());
    if !path.is_absolute() || !path.is_dir(){return Err("invalid_directory".into());}
    let path=path.canonicalize().map_err(|e|e.to_string())?;
    let file=app.path().home_dir().map_err(|e|e.to_string())?.join(".tokenplan-account-directories.json");
    let mut entries:std::collections::BTreeMap<String,Vec<String>>=if file.exists(){
        serde_json::from_slice(&std::fs::read(&file).map_err(|e|e.to_string())?).map_err(|_|"invalid_directory_registry")?
    }else{Default::default()};
    let paths=entries.entry(provider).or_default();
    let path=path.to_string_lossy().into_owned();
    if !paths.contains(&path){if paths.len()>=64{return Err("directory_limit".into());}paths.push(path);}
    let pending=file.with_extension("json.tmp");
    std::fs::write(&pending,serde_json::to_vec(&entries).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    std::fs::rename(pending,file).map_err(|e|e.to_string())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test] fn guide_commands_quote_paths_and_never_target_the_default_login() {
        let path=Path::new("/users/O'Brien/.claude-tokenplan-1");
        assert_eq!(login_command("claude",path,false),"env CLAUDE_CONFIG_DIR='/users/O'\"'\"'Brien/.claude-tokenplan-1' claude auth login");
        assert!(login_command("codex",path,true).contains("O''Brien"));
        assert!(family("claude; echo unsafe").is_err());
    }
}
