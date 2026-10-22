//! Opens project pages in the default browser. The webview has no general "open URL" ability on purpose:
//! only https links inside this project's own repository are accepted, so the About page can offer
//! release notes and issue reporting without handing the page a way to launch arbitrary addresses.
use std::process::Command;

const ALLOWED_BASES: &[&str] = &["https://github.com/onevalar/token-plan"];

/// True for the project page itself or anything beneath it, with no characters a shell or URL
/// handler could treat specially.
pub fn allowed(url: &str) -> bool {
    let plain = url.is_ascii()
        && !url.chars().any(|c| c.is_control() || matches!(c, ' ' | '\\' | '"' | '<' | '>' | '|' | '^' | '&' | '`' | '$' | ';'));
    plain
        && ALLOWED_BASES.iter().any(|base| {
            url == *base || url.strip_prefix(base).is_some_and(|rest| rest.starts_with('/') || rest.starts_with('?') || rest.starts_with('#'))
        })
}

#[tauri::command]
pub fn open_link(url: String) -> Result<(), String> {
    if !allowed(&url) {
        return Err("link_not_allowed".into());
    }
    #[cfg(target_os = "macos")]
    let spawned = Command::new("open").arg(&url).spawn();
    #[cfg(target_os = "windows")]
    let spawned = Command::new("explorer.exe").arg(&url).spawn();
    #[cfg(all(not(target_os = "macos"), not(target_os = "windows")))]
    let spawned = Command::new("xdg-open").arg(&url).spawn();
    spawned.map(|_| ()).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::allowed;

    #[test]
    fn accepts_only_the_project_repository() {
        for url in [
            "https://github.com/onevalar/token-plan",
            "https://github.com/onevalar/token-plan/releases",
            "https://github.com/onevalar/token-plan/issues/new?template=bug_report.yml",
            "https://github.com/onevalar/token-plan/blob/main/LICENSE#L1",
        ] {
            assert!(allowed(url), "{url}");
        }
    }

    #[test]
    fn rejects_lookalikes_other_schemes_and_shell_characters() {
        for url in [
            "http://github.com/onevalar/token-plan",
            "https://github.com/onevalar/token-plan-evil",
            "https://github.com/onevalar/token-planner/releases",
            "https://github.com.evil.example/onevalar/token-plan",
            "https://example.com/?u=https://github.com/onevalar/token-plan",
            "file:///etc/passwd",
            "https://github.com/onevalar/token-plan/a b",
            "https://github.com/onevalar/token-plan/&calc",
            "https://github.com/onevalar/token-plan/$(id)",
            "https://github.com/onevalar/token-plan/\n",
            "",
        ] {
            assert!(!allowed(url), "{url:?}");
        }
    }
}
