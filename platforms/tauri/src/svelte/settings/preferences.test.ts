import {afterEach, describe, expect, it, vi} from 'vitest';
import {createDensity, createHomeUsageStyle, glassColors, glassMaterial, homeStyleFor, homeStyleKey, homeStyleMode, readHomeStyles} from '../preferences.svelte';

function storage(seed: Record<string, string> = {}) {
 const values = new Map(Object.entries(seed));
 return {getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); }};
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('native settings preferences', () => {
 it('migrates the old density key and preserves a failed write without changing the selection', () => {
  const local = storage({'tokenplan.mac.homeDensity': 'comfortable'}); vi.stubGlobal('localStorage', local);
  const preference = createDensity(); expect(preference.density).toBe('comfortable');
  preference.changeDensity('compact'); expect(preference.density).toBe('compact'); expect(local.getItem('tokenplan.homeDensity')).toBe('compact');
  vi.spyOn(local, 'setItem').mockImplementationOnce(() => { throw new Error('blocked'); });
  preference.changeDensity('comfortable'); expect(preference.failed).toBe(true); expect(preference.density).toBe('compact');
  preference.changeDensity('comfortable'); expect(preference.failed).toBe(false); expect(preference.density).toBe('comfortable');
 });
 it('lets the new density key override the legacy choice, including compact', () => {
  vi.stubGlobal('localStorage', storage({'tokenplan.homeDensity': 'compact', 'tokenplan.mac.homeDensity': 'comfortable'}));
  expect(createDensity().density).toBe('compact');
 });
 it('migrates the legacy style and rejects invalid persisted records', () => {
  expect(readHomeStyles(storage({'tokenplan.homeUsageStyle': 'rings'}))).toEqual({mode: 'uniform', style: 'rings', customDefault: 'rings', accounts: {}, initialized: false});
  const good = readHomeStyles(storage());
  for (const patch of [{mode: 'invalid'}, {style: 'no-such-style'}, {customDefault: null}, {initialized: 1}, {accounts: []}, {accounts: {bad: 'invalid'}}]) {
   expect(() => readHomeStyles(storage({[homeStyleKey]: JSON.stringify({...good, ...patch})}))).toThrow();
  }
  expect(() => readHomeStyles(storage({[homeStyleKey]: '{'}))).toThrow();
 });
 it('captures the uniform style once as the per-account default and retains overrides', () => {
  const p = {...readHomeStyles(storage()), style: 'rings', accounts: {one: 'gauges'}};
  expect(homeStyleFor(p, 'one')).toBe('rings');
  const custom = homeStyleMode(p, 'custom'); expect(homeStyleFor(custom, 'one')).toBe('gauges'); expect(homeStyleFor(custom, 'two')).toBe('rings');
  const again = homeStyleMode({...homeStyleMode(custom, 'uniform'), style: 'numbers'}, 'custom');
  expect(again.customDefault).toBe('rings'); expect(again.accounts.one).toBe('gauges');
 });
 it('exposes live getters, persists sequential changes, and keeps the accepted preference on failure', () => {
  const local = storage(); vi.stubGlobal('localStorage', local); vi.spyOn(console, 'error').mockImplementation(() => {});
  const p = createHomeUsageStyle(); p.changeStyle('rings'); p.changeMode('custom'); p.changeAccountStyle('one', 'gauges');
  expect(p.mode).toBe('custom'); expect(p.styleFor('one')).toBe('gauges'); expect(p.styleFor('two')).toBe('rings'); expect(p.initialized).toBe(true);
  expect(JSON.parse(local.getItem(homeStyleKey)!)).toEqual({mode: 'custom', style: 'rings', customDefault: 'rings', accounts: {one: 'gauges'}, initialized: true});
  vi.spyOn(local, 'setItem').mockImplementationOnce(() => { throw new Error('blocked'); }); p.changeStyle('numbers');
  expect(p.style).toBe('rings'); expect(p.error).toBe('Could not save. Try again.');
  p.changeStyle('numbers'); expect(p.style).toBe('numbers'); expect(p.error).toBe('');
 });
 it('reports an unreadable store and recovers by saving a choice', () => {
  const local = storage({[homeStyleKey]: 'invalid'}); vi.stubGlobal('localStorage', local); vi.spyOn(console, 'error').mockImplementation(() => {});
  const p = createHomeUsageStyle(); expect(p.style).toBe('bars'); expect(p.error).toContain('Could not load');
  p.changeStyle('rings'); expect(p.error).toBe(''); expect(p.style).toBe('rings');
 });
});

describe('native panel surface contrast', () => {
 const channel = (c: number) => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
 const neutral = (l: number) => l ** 3 <= .0031308 ? 12.92 * l ** 3 : 1.055 * (l ** 3) ** (1 / 2.4) - .055;
 const contrast = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
 for (const theme of ['light', 'dark'] as const) it(`retains the ${theme} worst-backdrop AA text and 3:1 graphic floor`, () => {
  // Independently use the actual Valar neutral theme, not the source theme.
  const p = theme === 'light' ? {tint: 1, text: neutral(.145), worst: 0, lift: 0} : {tint: neutral(.145), text: neutral(.985), worst: 1, lift: .12};
  let previousTint = 101;
  for (let transparency = 0; transparency <= 100; transparency += 5) {
   const c = glassColors(theme, transparency), tint = c.tint / 100;
   const panel = tint * p.tint + (1 - tint) * p.worst, background = panel + p.lift * (1 - panel), back = channel(background);
   expect(c.tint).toBeLessThan(previousTint); previousTint = c.tint;
   for (const opacity of [c.muted, c.secondary]) expect(contrast(channel(opacity / 100 * p.text + (1 - opacity / 100) * background), back)).toBeGreaterThanOrEqual(4.5);
   for (const [name, {color}] of Object.entries(c.status)) {
    const [r, g, b] = color.map(v => channel(Math.round(v * 255) / 255));
    expect(contrast(.2126 * r + .7152 * g + .0722 * b, back)).toBeGreaterThanOrEqual(name === 'usage' ? 3 : 4.5);
   }
  }
 });
 it('offers the platform material only where supported', () => { expect(glassMaterial('macos')).toBe('Frosted Glass'); expect(glassMaterial('windows')).toBe('Acrylic'); expect(glassMaterial('linux')).toBeNull(); });
});
