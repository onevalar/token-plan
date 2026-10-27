// Keep the current Tauri package identity while replacing the legacy Avalonia package.
export const linuxIcons=[32,48,128,256,512].map(size=>`../../desktop/assets/icons/tokenplan-${size}.png`);
export function linuxDebConfig(version) {
  return {
    depends: ['libc6 (>= 2.35)', 'libgcc-s1', 'libstdc++6', 'libglib2.0-0 (>= 2.72)', 'glib-networking', 'libgtk-3-0 (>= 3.24)', 'libwebkit2gtk-4.1-0', 'libayatana-appindicator3-1', 'libssl3', 'libicu70 | libicu74', 'zlib1g'],
    conflicts: ['tokenplan'],
    replaces: ['tokenplan'],
    provides: [`tokenplan (= ${version})`],
    postInstallScript: 'linux/refresh-desktop-cache.sh',
    postRemoveScript: 'linux/refresh-desktop-cache.sh',
    files: {
      '/usr/bin/tokenplan': 'linux/tokenplan',
      '/opt/tokenplan/TokenPlan.Desktop': 'linux/tokenplan',
      '/usr/share/applications/tokenplan.desktop': 'linux/tokenplan.desktop',
    },
  };
}
