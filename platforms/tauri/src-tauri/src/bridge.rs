use crate::model::DesktopState;
use serde_json::{json, Value};
use std::{process::Stdio, time::{Duration, Instant}};
use tauri::{Emitter, Manager};
use tokio::{io::{AsyncBufReadExt, AsyncWriteExt, BufReader}, process::{Child, ChildStdin, ChildStdout, Command}, sync::Mutex};

struct Process { child: Child, input: ChildStdin, output: BufReader<ChildStdout> }
#[derive(Default)]
pub struct Bridge { process: Mutex<Option<Process>>, latest: Mutex<Option<DesktopState>> }

impl Bridge {
    async fn spawn() -> Result<Process, String> {
        let executable = std::env::current_exe().map_err(|_| "bridge_unavailable")?;
        let filename = if cfg!(windows) { "tokenplan-bridge.exe" } else { "tokenplan-bridge" };
        let path = executable.parent().ok_or("bridge_unavailable")?.join(filename);
        let mut command = Command::new(path);
        command.arg("--desktop-bridge").stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null()).kill_on_drop(true);
        #[cfg(target_os = "macos")]
        command.env("TOKENPLAN_DEFAULTS_SUITE", std::env::var("TOKENPLAN_DEFAULTS_SUITE").unwrap_or_else(|_| "com.onevalar.tokenplan".into()));
        #[cfg(target_os = "windows")]
        command.creation_flags(0x08000000);
        let mut child = command.spawn().map_err(|_| "bridge_unavailable")?;
        Ok(Process { input: child.stdin.take().ok_or("bridge_unavailable")?, output: BufReader::new(child.stdout.take().ok_or("bridge_unavailable")?), child })
    }
    async fn call(&self, request: Value) -> Result<DesktopState, String> {
        let mut holder = self.process.lock().await;
        if holder.is_none() { *holder = Some(Self::spawn().await?); }
        let process = holder.as_mut().unwrap();
        let mut bytes = serde_json::to_vec(&request).map_err(|_| "request_failed")?;
        if bytes.len() > 65536 { return Err("request_failed".into()); }
        bytes.push(b'\n');
        let response = tokio::time::timeout(Duration::from_secs(150), async {
            process.input.write_all(&bytes).await.map_err(|_| "read_failed")?;
            process.input.flush().await.map_err(|_| "read_failed")?;
            let mut output = Vec::new();
            loop {
                let buffer = process.output.fill_buf().await.map_err(|_| "read_failed")?;
                if buffer.is_empty() { return Err("read_failed"); }
                let end = buffer.iter().position(|b| *b == b'\n');
                let count = end.map(|n| n + 1).unwrap_or(buffer.len());
                if output.len() + count > 8 * 1024 * 1024 { return Err("invalid_response"); }
                output.extend_from_slice(&buffer[..count]); process.output.consume(count);
                if end.is_some() { break; }
            }
            Ok(output)
        }).await;
        let output = match response {
            Ok(Ok(output)) => output,
            _ => { let _ = process.child.kill().await; *holder = None; return Err("read_failed".into()); }
        };
        let reply: Value = serde_json::from_slice(&output).map_err(|_| "invalid_response")?;
        if reply["ok"] != true { return Err(if reply["error"] == "pin_limit" { "pin_limit" } else { "request_failed" }.into()); }
        let state: DesktopState = serde_json::from_value(reply["state"].clone()).map_err(|_| "invalid_response")?;
        if !state.validate() { return Err("invalid_response".into()); }
        *self.latest.lock().await = Some(state.clone());
        Ok(state)
    }
}

#[tauri::command]
pub async fn desktop_request(app: tauri::AppHandle, request: Value) -> Result<DesktopState, String> {
    let method = request["method"].as_str().ok_or("request_failed")?;
    if !["state","refresh","discover","enabled","remove","tray","metric","move","settings","key","note"].contains(&method) { return Err("request_failed".into()); }
    let state = app.state::<Bridge>().call(request).await?;
    let _ = app.emit("desktop-state", &state);
    #[cfg(not(target_os="linux"))]
    let tray_result = crate::tray::update(&app, &state).map_err(|_| ());
    #[cfg(target_os="linux")]
    let tray_result = crate::linux_tray::update(&app, &state).await;
    if tray_result.is_err() {
        let _ = app.emit("desktop-error", "tray_failed");
    }
    Ok(state)
}

pub fn start_background(app: tauri::AppHandle) {
    tauri::async_runtime::spawn(async move {
        let mut refreshed = Instant::now() - Duration::from_secs(3600);
        loop {
            tokio::time::sleep(Duration::from_secs(15)).await;
            let state = app.state::<Bridge>().latest.lock().await.clone();
            if let Some(state) = state {
                if state.settings.auto_refresh && refreshed.elapsed().as_secs() >= state.settings.refresh_minutes * 60 {
                    refreshed = Instant::now();
                    if desktop_request(app.clone(), json!({"method":"refresh"})).await.is_err() {
                        let _ = app.emit("desktop-error", "read_failed");
                    }
                }
            }
        }
    });
}

pub async fn redraw_trays(app: tauri::AppHandle) {
    if let Some(state) = app.state::<Bridge>().latest.lock().await.clone() {
        #[cfg(not(target_os="linux"))]
        let _ = crate::tray::update(&app,&state);
        #[cfg(target_os="linux")]
        let _ = crate::linux_tray::update(&app,&state).await;
    }
}
