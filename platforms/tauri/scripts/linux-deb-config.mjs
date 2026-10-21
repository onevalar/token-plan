// Keep the current Tauri package identity while replacing the legacy Avalonia package.
export const linuxIcons=[32,48,128,256,512].map(size=>`../../desktop/assets/icons/tokenplan-${size}.png`);
export function linuxDebConfig(version) {
  return {
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
