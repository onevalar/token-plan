import {invoke} from '@tauri-apps/api/core';
import {Effect, getCurrentWindow} from '@tauri-apps/api/window';
import {isHomeUsageStyle, type HomeUsageStyle} from '../homeUsage';
import type {DesktopState} from '../desktop';

export type Density = 'compact' | 'comfortable';
export function createDensity() {
 let density = $state<Density>('compact');
 let failed = $state(false);
 try { density = (localStorage.getItem('tokenplan.homeDensity') ?? localStorage.getItem('tokenplan.mac.homeDensity')) === 'comfortable' ? 'comfortable' : 'compact'; } catch { /* Original default when storage is unavailable. */ }
 return {
  get density() { return density; }, get failed() { return failed; },
  changeDensity(value: Density) { try { localStorage.setItem('tokenplan.homeDensity', value); density = value; failed = false; } catch { failed = true; } },
 };
}
export type DensityPreference = ReturnType<typeof createDensity>;

export const homeStyleKey = 'tokenplan.homeUsagePreferences';
export type HomeStyleMode = 'uniform' | 'custom';
export type HomeStylePreferences = {mode: HomeStyleMode; style: HomeUsageStyle; customDefault: HomeUsageStyle; accounts: Record<string, HomeUsageStyle>; initialized: boolean};
export function readHomeStyles(storage: Pick<Storage, 'getItem'>): HomeStylePreferences {
 const raw = storage.getItem(homeStyleKey);
 if (raw) {
  const p = JSON.parse(raw);
  if (!p || !['uniform', 'custom'].includes(p.mode) || !isHomeUsageStyle(p.style) || !isHomeUsageStyle(p.customDefault) || typeof p.initialized !== 'boolean' || !p.accounts || typeof p.accounts !== 'object' || Array.isArray(p.accounts) || Object.values(p.accounts).some(v => typeof v !== 'string' || !isHomeUsageStyle(v))) throw new Error('Invalid Home styles');
  return p;
 }
 const legacy = storage.getItem('tokenplan.homeUsageStyle') ?? 'bars';
 if (!isHomeUsageStyle(legacy)) throw new Error('Invalid Home style');
 return {mode: 'uniform', style: legacy, customDefault: legacy, accounts: {}, initialized: false};
}
export function homeStyleFor(p: HomeStylePreferences, id: string): HomeUsageStyle { return p.mode === 'uniform' ? p.style : p.accounts[id] ?? p.customDefault; }
export function homeStyleMode(p: HomeStylePreferences, mode: HomeStyleMode): HomeStylePreferences { return {...p, mode, ...mode === 'custom' && !p.initialized ? {initialized: true, customDefault: p.style} : {}}; }
export function createHomeUsageStyle() {
 let error = $state('');
 let preference = $state<HomeStylePreferences>({mode: 'uniform', style: 'bars', customDefault: 'bars', accounts: {}, initialized: false});
 try { preference = readHomeStyles(localStorage); } catch (e) { console.error('Home styles could not be read', e); error = 'Could not load the Home usage style. Choose a style to save it again.'; }
 const change = (next: HomeStylePreferences) => {
  try { localStorage.setItem(homeStyleKey, JSON.stringify(next)); preference = next; error = ''; }
  catch (e) { console.error('Home styles could not be saved', e); error = 'Could not save. Try again.'; }
 };
 return {
  get mode() { return preference.mode; }, get style() { return preference.style; }, get customDefault() { return preference.customDefault; },
  get accounts() { return preference.accounts; }, get initialized() { return preference.initialized; }, get error() { return error; },
  styleFor: (id: string) => homeStyleFor(preference, id),
  changeStyle: (style: HomeUsageStyle) => change({...preference, style}),
  changeMode: (mode: HomeStyleMode) => change(homeStyleMode(preference, mode)),
  changeAccountStyle: (id: string, style: HomeUsageStyle) => change({...preference, accounts: {...preference.accounts, [id]: style}}),
 };
}
export type HomeUsageStylePreference = ReturnType<typeof createHomeUsageStyle>;

export type AccountSetup = {id: string; provider: string; label: string; directory: string};
export function createAccountSetups() {
 let records = $state<AccountSetup[]>([]), error = $state('');
 let mounted = true;
 const reload = async () => {
  try { const next = await invoke<AccountSetup[]>('account_setups'); if (mounted) { records = next; error = ''; } }
  catch (e) { console.error('Pending accounts could not be read', e); if (mounted) error = 'Could not load pending accounts. Try again.'; throw e; }
 };
 $effect(() => { mounted = true; void reload().catch(() => {}); return () => { mounted = false; }; });
 return {get records() { return records; }, get error() { return error; }, reload, forget: async (id: string) => { await invoke('account_setup_remove', {id}); await reload(); }};
}
export type AccountSetups = ReturnType<typeof createAccountSetups>;

export type PanelStyle = 'glass' | 'solid';
export type PanelSurface = {style: PanelStyle; transparency: number};
type Channels = [number, number, number];
export const minimumTransparency = 20;
export const defaultSurface: PanelSurface = {style: 'glass', transparency: 60};
export const glassMaterial = (platform: string) => platform === 'macos' ? 'Frosted Glass' : platform === 'windows' ? 'Acrylic' : null;
const encode = (c: number) => { c = Math.min(1, Math.max(0, c)); return c <= .0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - .055; };
const oklch = (l: number, c: number, h: number): Channels => {
 const a = c * Math.cos(h * Math.PI / 180), b = c * Math.sin(h * Math.PI / 180);
 const L = (l + .3963377774 * a + .2158037573 * b) ** 3, M = (l - .1055613458 * a - .0638541728 * b) ** 3, S = (l - .0894841775 * a - 1.291485548 * b) ** 3;
 return [encode(4.0767416621 * L - 3.3077115913 * M + .2309699292 * S), encode(-1.2684380046 * L + 2.6097574011 * M - .3413193965 * S), encode(-.0041960863 * L - .7034186147 * M + 1.707612701 * S)];
};
// Valar's neutral background/foreground/primary/destructive tokens plus the app's
// semantic success/warning aliases in svelte/theme.css. Do not reuse Arc's palette.
const palette = {
 light: {tint: oklch(1, 0, 0)[0], text: oklch(.145, 0, 0)[0], worst: 0, lift: 0, status: {success: oklch(.49, .15, 150), warning: oklch(.55, .13, 75), danger: oklch(.577, .245, 27.325), usage: oklch(.205, 0, 0)}},
 dark: {tint: oklch(.145, 0, 0)[0], text: oklch(.985, 0, 0)[0], worst: 1, lift: .12, status: {success: oklch(.78, .15, 150), warning: oklch(.83, .13, 80), danger: oklch(.704, .191, 22.216), usage: oklch(.922, 0, 0)}},
};
const statusTarget = {success: 4.5, warning: 4.5, danger: 4.5, usage: 3};
export type StatusColor = keyof typeof statusTarget;
const luminance = (c: number) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
const relative = ([r, g, b]: Channels) => .2126 * luminance(r) + .7152 * luminance(g) + .0722 * luminance(b);
const ratio = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
/** Preserve the original worst-backdrop contrast floor and emitted integer channels. */
export function glassColors(theme: 'light' | 'dark', transparency: number) {
 const amount = Math.sqrt(Math.min(100, Math.max(0, transparency)) / 100), p = palette[theme];
 const tint = Math.round((1 - amount * (1 - (theme === 'light' ? .58 : .74))) * 10000) / 10000;
 const panel = tint * p.tint + (1 - tint) * p.worst, backdrop = panel + p.lift * (1 - panel), back = luminance(backdrop);
 const opacity = (target: number) => { for (let o = 0; o <= 100; o++) if (ratio(luminance(o / 100 * p.text + (1 - o / 100) * backdrop), back) >= target) return o; return 100; };
 const strongest = ratio(luminance(p.text), back);
 const status = Object.fromEntries((Object.keys(statusTarget) as StatusColor[]).map(name => {
  const at = (mix: number) => p.status[name].map(c => Math.round((mix / 100 * p.text + (1 - mix / 100) * c) * 255) / 255) as Channels;
  let mix = 0; while (mix < 100 && ratio(relative(at(mix)), back) < statusTarget[name]) mix++;
  return [name, {mix, color: at(mix)}];
 })) as Record<StatusColor, {mix: number; color: Channels}>;
 return {tint: Math.round(tint * 10000) / 100, secondary: opacity(Math.max(4.5, Math.min(7, strongest * .85))), muted: opacity(4.5), worstContrast: strongest, status};
}
function readSurface(): PanelSurface {
 try { const saved = JSON.parse(localStorage.getItem('tokenplan.panelSurface') ?? 'null') as Partial<PanelSurface> | null;
  return {style: saved?.style === 'solid' ? 'solid' : 'glass', transparency: typeof saved?.transparency === 'number' ? Math.min(100, Math.max(minimumTransparency, saved.transparency)) : defaultSurface.transparency};
 } catch { return {...defaultSurface}; }
}
export function createPanelSurface(platform: () => string, reduceTransparency: () => boolean) {
 let surface = $state(readSurface()), failed = $state(false), mediaReduced = $state(false);
 const reduced = $derived(platform() === 'macos' ? reduceTransparency() : mediaReduced);
 const glass = $derived(surface.style === 'glass' && glassMaterial(platform()) !== null && !reduced);
 $effect(() => { const query = matchMedia('(prefers-reduced-transparency: reduce)'); const update = () => { mediaReduced = query.matches; }; update(); query.addEventListener('change', update); return () => query.removeEventListener('change', update); });
 $effect(() => {
  const root = document.documentElement; root.dataset.panel = glass ? 'glass' : 'solid';
  for (const theme of ['light', 'dark'] as const) {
   const c = glassColors(theme, surface.transparency);
   root.style.setProperty(`--panel-tint-${theme}`, `${c.tint}%`); root.style.setProperty(`--glass-secondary-${theme}`, `${c.secondary}%`); root.style.setProperty(`--glass-muted-${theme}`, `${c.muted}%`);
   for (const [name, {color}] of Object.entries(c.status)) root.style.setProperty(`--glass-${name}-${theme}`, `rgb(${color.map(v => Math.round(v * 255)).join(' ')})`);
  }
 });
 $effect(() => { if (platform() !== 'windows') return; const enabled = glass; void (async () => { const panel = getCurrentWindow(); await (enabled ? panel.setEffects({effects: [Effect.Acrylic]}) : panel.clearEffects()); })().catch(e => console.error('Panel window effect could not be changed', e)); });
 return {get surface() { return surface; }, get failed() { return failed; }, get reduced() { return reduced; }, get material() { return glassMaterial(platform()); }, change(patch: Partial<PanelSurface>) { surface = {...surface, ...patch}; try { localStorage.setItem('tokenplan.panelSurface', JSON.stringify(surface)); failed = false; } catch { failed = true; } }};
}
export type PanelSurfacePreference = ReturnType<typeof createPanelSurface>;
export function createPanelAppearance(platform: () => string, appearance: () => DesktopState['settings']['appearance'] | undefined) {
 let attempt = $state(0), failed = $state(false), pending = $state(false);
 $effect(() => {
  const value = appearance(); void attempt;
  if (platform() !== 'macos' || !value) return;
  let current = true; pending = true;
  void invoke('panel_appearance', {appearance: value === 'system' ? null : value}).then(() => { if (current) { failed = false; pending = false; } }).catch(e => { console.error('Native panel appearance could not be changed', e); if (current) { failed = true; pending = false; } });
  return () => { current = false; };
 });
 return {get failed() { return failed; }, get pending() { return pending; }, retry() { attempt++; }};
}
export type PanelAppearancePreference = ReturnType<typeof createPanelAppearance>;
