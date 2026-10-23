//! Pending account setup records contain only a label and a directory, never credentials.
use std::{
    collections::BTreeMap,
    io::Write,
    path::{Path, PathBuf},
};
#[derive(Clone, Debug, serde::Serialize, serde::Deserialize)]
pub struct SetupRecord {
    pub id: String,
    pub provider: String,
    pub label: String,
    pub directory: String,
}
const RECORDS: &str = ".tokenplan-account-setups.json";
fn read<T: serde::de::DeserializeOwned + Default>(file: &Path) -> Result<T, String> {
    match std::fs::read(file) {
        Ok(bytes) if bytes.len() <= 1_048_576 => {
            serde_json::from_slice(&bytes).map_err(|_| "invalid_directory_registry".into())
        }
        Ok(_) => Err("invalid_directory_registry".into()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(T::default()),
        Err(e) => Err(e.to_string()),
    }
}
fn write(file: &Path, value: &impl serde::Serialize) -> Result<(), String> {
    let temporary = file.with_extension(format!("{}.tmp", std::process::id()));
    let mut created = false;
    let result = (|| {
        let mut options = std::fs::OpenOptions::new();
        options.write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let mut output = options.open(&temporary).map_err(|e| e.to_string())?;
        created = true;
        output
            .write_all(&serde_json::to_vec(value).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        output.sync_all().map_err(|e| e.to_string())?;
        drop(output);
        std::fs::rename(&temporary, file).map_err(|e| e.to_string())
    })();
    if result.is_err() && created {
        let _ = std::fs::remove_file(&temporary);
    }
    result
}
pub fn list(home: &Path) -> Result<Vec<SetupRecord>, String> {
    read(&home.join(RECORDS))
}
pub fn register(home: &Path, provider: &str, path: &Path) -> Result<(), String> {
    if !path.is_absolute() || !path.is_dir() {
        return Err("invalid_directory".into());
    }
    let path = path
        .canonicalize()
        .map_err(|e| e.to_string())?
        .to_string_lossy()
        .into_owned();
    let file = home.join(".tokenplan-account-directories.json");
    let mut entries: BTreeMap<String, Vec<String>> = read(&file)?;
    let paths = entries.entry(provider.into()).or_default();
    if paths.contains(&path) {
        return Ok(());
    }
    if paths.len() >= 64 {
        return Err("directory_limit".into());
    }
    paths.push(path);
    write(&file, &entries)
}
pub fn create(home: &Path, provider: &str, label: &str) -> Result<SetupRecord, String> {
    if !["claude", "codex"].contains(&provider) {
        return Err("unsupported_provider".into());
    }
    if label.chars().count() > 120 || label.chars().any(char::is_control) {
        return Err("invalid_label".into());
    }
    let mut records = list(home)?;
    if records.len() >= 64 {
        return Err("directory_limit".into());
    }
    // Reserve a human-readable sibling directory. Existing directories and symlinks are skipped.
    for index in 1..10000 {
        let id = format!(".{provider}-account{index}");
        let path = home.join(&id);
        let mut builder = std::fs::DirBuilder::new();
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt;
            builder.mode(0o700);
        }
        match builder.create(&path) {
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e.to_string()),
            Ok(()) => {}
        }
        let result = (|| {
            register(home, provider, &path)?;
            let record = SetupRecord {
                id,
                provider: provider.into(),
                label: label.trim().into(),
                directory: path
                    .canonicalize()
                    .map_err(|e| e.to_string())?
                    .to_string_lossy()
                    .into_owned(),
            };
            records.push(record.clone());
            write(&home.join(RECORDS), &records)?;
            Ok(record)
        })();
        // Only our new empty folder may be rolled back. A login directory is never recursively removed.
        if result.is_err() {
            let _ = std::fs::remove_dir(&path);
        }
        return result;
    }
    Err("directory_limit".into())
}
pub fn forget(home: &Path, id: &str) -> Result<(), String> {
    let mut records = list(home)?;
    records.retain(|r| r.id != id);
    write(&home.join(RECORDS), &records)
}
pub fn registered_directory(
    home: &Path,
    provider: &str,
    directory: &str,
) -> Result<PathBuf, String> {
    let path = PathBuf::from(directory);
    if !path.is_absolute() || !path.is_dir() {
        return Err("invalid_directory".into());
    }
    let path = path.canonicalize().map_err(|e| e.to_string())?;
    let entries: BTreeMap<String, Vec<String>> =
        read(&home.join(".tokenplan-account-directories.json"))?;
    if !entries
        .get(provider)
        .is_some_and(|paths| paths.iter().any(|p| Path::new(p) == path))
    {
        return Err("invalid_directory".into());
    }
    Ok(path)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn setups_reserve_private_folders_and_survive_restarts_without_touching_existing_logins() {
        let root = std::env::temp_dir().join(format!(
            "tokenplan-account-test-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        std::fs::create_dir(&root).unwrap();
        std::fs::create_dir(root.join(".claude-account1")).unwrap();
        std::fs::write(root.join(".claude-account1/keep"), "existing").unwrap();
        let first = create(&root, "claude", "Personal").unwrap();
        let second = create(&root, "claude", "Work").unwrap();
        assert_eq!(first.id, ".claude-account2");
        assert_eq!(second.id, ".claude-account3");
        assert_eq!(list(&root).unwrap().len(), 2);
        assert!(registered_directory(&root, "claude", &first.directory).is_ok());
        assert!(registered_directory(&root, "codex", &first.directory).is_err());
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            assert_eq!(
                std::fs::metadata(&first.directory)
                    .unwrap()
                    .permissions()
                    .mode()
                    & 0o777,
                0o700
            );
        }
        std::fs::write(Path::new(&first.directory).join("keep"), "login").unwrap();
        forget(&root, &first.id).unwrap();
        assert_eq!(list(&root).unwrap().len(), 1);
        assert!(Path::new(&first.directory).join("keep").exists());
        assert_eq!(
            std::fs::read_to_string(root.join(".claude-account1/keep")).unwrap(),
            "existing"
        );
        assert!(create(&root, "../bad", "").is_err());
        assert!(create(&root, "claude", "bad\nlabel").is_err());
        std::fs::remove_dir_all(root).unwrap();
    }
}
