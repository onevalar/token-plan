fn main() {
    println!("cargo:rerun-if-env-changed=VITE_MAC_NAVIGATION_PREVIEW");
    tauri_build::build();
    // The development helper uses SwiftPM's executable-relative resource lookup.
    // Release packaging remains disabled until signing/updater migration is complete.
    #[cfg(target_os = "macos")]
    {
        let out = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());
        let target = out.ancestors().nth(3).unwrap();
        for name in ["OpenUsage_OpenUsage.bundle", "Sparkle.framework"] {
            println!("cargo:rerun-if-changed=binaries/{name}");
            let source = std::path::Path::new("binaries").join(name);
            if source.exists() {
                let status = std::process::Command::new("/usr/bin/ditto")
                    .arg(source)
                    .arg(target.join(name))
                    .status()
                    .unwrap();
                assert!(status.success(), "Could not stage Swift helper resources");
            }
        }
    }
}
