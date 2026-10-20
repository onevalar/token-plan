import {readFileSync} from 'node:fs';
// Packaging must inherit the same panel behavior tested in the preview.
export function packageWindows(title) {
 const config=JSON.parse(readFileSync(new URL('../src-tauri/tauri.conf.json',import.meta.url),'utf8'));
 return config.app.windows.map(window=>({...window,title}));
}
