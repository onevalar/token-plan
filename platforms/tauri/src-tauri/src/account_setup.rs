//! Explicit, user-initiated login guidance. Credentials stay with the official CLI.
use std::{
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
};
use tauri::Manager;

#[derive(Default)]
pub struct AccountSetup(Mutex<()>);
#[derive(serde::Serialize)]
pub struct LoginGuide {
    command: String,
    directory: String,
    opened: bool,
    setup: Option<crate::account_records::SetupRecord>,
}
// Design builds must never read or mutate the user's real account registry.
fn setup_home(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    if option_env!("VITE_MAC_NAVIGATION_PREVIEW") == Some("1") {
        let home = app.path().app_cache_dir().map_err(|e| e.to_string())?.join("mock-accounts");
        std::fs::create_dir_all(&home).map_err(|e| e.to_string())?;
        Ok(home)
    } else {
        app.path().home_dir().map_err(|e| e.to_string())
    }
}
fn family(value: &str) -> Result<(), String> {
    if ["claude", "codex"].contains(&value) {
        Ok(())
    } else {
        Err("unsupported_provider".into())
    }
}
fn quote_sh(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\"'\"'"))
}
fn login_command(provider: &str, path: &Path, windows: bool) -> String {
    let variable = if provider == "claude" {
        "CLAUDE_CONFIG_DIR"
    } else {
        "CODEX_HOME"
    };
    let args = if provider == "claude" {
        "auth login"
    } else {
        "-c 'cli_auth_credentials_store=\"file\"' login"
    };
    if windows {
        format!(
            "$env:{variable}='{}'; {provider} {args}",
            path.to_string_lossy().replace('\'', "''")
        )
    } else {
        format!(
            "env {variable}={} {provider} {args}",
            quote_sh(&path.to_string_lossy())
        )
    }
}
fn terminal(command: &str) -> bool {
    #[cfg(target_os = "macos")]
    {
        let escaped = command.replace('\\', "\\\\").replace('"', "\\\"");
        return Command::new("osascript")
            .args([
                "-e",
                &format!("tell application \"Terminal\" to do script \"{escaped}\""),
                "-e",
                "tell application \"Terminal\" to activate",
            ])
            .output()
            .is_ok_and(|o| o.status.success());
    }
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        return Command::new("powershell.exe")
            .args(["-NoProfile", "-NoExit", "-Command", command])
            .creation_flags(0x00000010)
            .spawn()
            .is_ok();
    }
    #[cfg(target_os = "linux")]
    {
        for (program, flag) in [
            ("x-terminal-emulator", "-e"),
            ("gnome-terminal", "--"),
            ("konsole", "-e"),
            ("xterm", "-e"),
        ] {
            if Command::new(program)
                .args([
                    flag,
                    "sh",
                    "-lc",
                    &format!("{command}; printf '\\nPress Enter to close'; read answer"),
                ])
                .spawn()
                .is_ok()
            {
                return true;
            }
        }
        false
    }
}
#[tauri::command]
pub async fn account_login(
    app: tauri::AppHandle,
    provider: String,
    directory: Option<String>,
) -> Result<LoginGuide, String> {
    family(&provider)?;
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<AccountSetup>();
        let _guard = state.0.lock().unwrap();
        let home = setup_home(&app)?;
        let setup = if directory.is_none() {
            Some(crate::account_records::create(&home, &provider, "")?)
        } else {
            None
        };
        let directory = match directory {
            Some(path) => crate::account_records::registered_directory(&home, &provider, &path)?,
            None => PathBuf::from(&setup.as_ref().unwrap().directory),
        };
        let command = login_command(&provider, &directory, cfg!(windows));
        let opened = if option_env!("VITE_MAC_NAVIGATION_PREVIEW") == Some("1") { true } else { terminal(&command) };
        if !opened {
            eprintln!("Could not open a terminal for account login; showing the command instead");
        }
        Ok(LoginGuide {
            command,
            directory: directory.to_string_lossy().into(),
            opened,
            setup,
        })
    })
    .await
    .map_err(|e| e.to_string())?
}

/// Only directory paths are registered, never passwords, tokens or copied auth documents.
#[tauri::command]
pub fn account_directory(
    app: tauri::AppHandle,
    provider: String,
    directory: String,
) -> Result<(), String> {
    family(&provider)?;
    let state = app.state::<AccountSetup>();
    let _guard = state.0.lock().unwrap();
    let home = setup_home(&app)?;
    if option_env!("VITE_MAC_NAVIGATION_PREVIEW") == Some("1") {
        let path = std::fs::canonicalize(directory.trim()).map_err(|e| e.to_string())?;
        if !path.starts_with(std::fs::canonicalize(&home).map_err(|e| e.to_string())?) {
            return Err("Design preview uses isolated sample accounts only".into());
        }
    }
    crate::account_records::register(&home, &provider, Path::new(directory.trim()))
}
#[tauri::command]
pub fn account_setups(
    app: tauri::AppHandle,
) -> Result<Vec<crate::account_records::SetupRecord>, String> {
    let state = app.state::<AccountSetup>();
    let _guard = state.0.lock().unwrap();
    crate::account_records::list(&setup_home(&app)?)
}
#[tauri::command]
pub fn account_setup_create(
    app: tauri::AppHandle,
    provider: String,
    label: String,
) -> Result<crate::account_records::SetupRecord, String> {
    family(&provider)?;
    let state = app.state::<AccountSetup>();
    let _guard = state.0.lock().unwrap();
    crate::account_records::create(
        &setup_home(&app)?,
        &provider,
        &label,
    )
}
#[tauri::command]
pub fn account_setup_remove(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let state = app.state::<AccountSetup>();
    let _guard = state.0.lock().unwrap();
    crate::account_records::forget(&setup_home(&app)?, &id)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn guide_commands_quote_paths_and_never_target_the_default_login() {
        let path = Path::new("/users/O'Brien/.claude-tokenplan-1");
        assert_eq!(
            login_command("claude", path, false),
            "env CLAUDE_CONFIG_DIR='/users/O'\"'\"'Brien/.claude-tokenplan-1' claude auth login"
        );
        assert!(login_command("codex", path, true).contains("O''Brien"));
        assert!(family("claude; echo unsafe").is_err());
    }
}
