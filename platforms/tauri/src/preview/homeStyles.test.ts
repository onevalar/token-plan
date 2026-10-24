import {describe,it,expect} from 'vitest';
import {homeStyleKey,readHomeStyles,homeStyleMode,homeStyleFor} from './useHomeUsageStyle';
import {styleCategories,categoryOf,homeUsageFamilies,parseStyle,canonicalStyle,styleOptions} from '../homeUsage';
import {sameLoginDirectory} from './AccountOnboarding';
describe('account style preferences',()=>{
 it('offers twelve style families and keeps every earlier saved style valid',()=>{
  expect(Object.keys(homeUsageFamilies)).toHaveLength(12);
  for(const old of ['bars','gauges','cells','rings','ruler','concentric','numbers','segments','ticks'])expect(parseStyle(old)).not.toBeNull();
  expect(parseStyle('segments')?.family).toBe('cells');expect(parseStyle('concentric')?.family).toBe('rings');
  expect(parseStyle('segments:capsule:10')).toMatchObject({shape:'capsule',count:10});
  expect(parseStyle('segments:capsule:7')).toBeNull();expect(parseStyle('vessel:tank')?.vessel).toBe('tank');expect(parseStyle('nope')).toBeNull();
  expect(canonicalStyle('segments')).toBe(canonicalStyle('segments:square:20'));
  expect(styleOptions('rings')[0].choices.map(c=>c.id)).toEqual(['rings','concentric','ticks']);
 });
 it('groups all existing renderers without losing saved variants',()=>{
  expect(styleCategories).toHaveLength(8);
  for(const c of styleCategories){expect(c.styles.length).toBeGreaterThanOrEqual(1);for(const id of c.styles)expect(categoryOf(id).id).toBe(c.id);}
  for(const id of Object.keys(homeUsageFamilies))expect(categoryOf(id).styles.some(s=>s===id)).toBe(true);
 });
 it('migrates the legacy global choice and preserves per-account choices through uniform mode',()=>{
  const getItem=(key:string)=>key==='tokenplan.homeUsageStyle'?'rings':null;
  const original=readHomeStyles({getItem});expect(original.mode).toBe('uniform');
  let p=homeStyleMode(original,'custom');p.accounts['claude:one']='numbers';
  expect(homeStyleFor(p,'claude:one')).toBe('numbers');expect(homeStyleFor(p,'claude:two')).toBe('rings');
  p={...homeStyleMode(p,'uniform'),style:'bars'};expect(homeStyleFor(p,'claude:one')).toBe('bars');
  p=homeStyleMode(p,'custom');expect(homeStyleFor(p,'claude:one')).toBe('numbers');expect(homeStyleFor(p,'claude:two')).toBe('rings');
  expect(readHomeStyles({getItem:key=>key===homeStyleKey?JSON.stringify(p):null})).toEqual(p);
 });
 it('persists Tick Ring as a uniform choice, custom default and independent account choice',()=>{
  const original=readHomeStyles({getItem:key=>key==='tokenplan.homeUsageStyle'?'ticks':null});
  expect(homeStyleFor(original,'claude:one')).toBe('ticks');
  let p=homeStyleMode(original,'custom');p.accounts={'claude:one':'cells','claude:two':'ticks'};
  p={...homeStyleMode(p,'uniform'),style:'gauges'};
  p=readHomeStyles({getItem:key=>key===homeStyleKey?JSON.stringify(p):null});
  expect(homeStyleFor(p,'claude:two')).toBe('gauges');
  p=homeStyleMode(p,'custom');
  expect(homeStyleFor(p,'claude:one')).toBe('cells');expect(homeStyleFor(p,'claude:two')).toBe('ticks');
  expect(homeStyleFor(p,'claude:new')).toBe('ticks');
  expect(readHomeStyles({getItem:key=>key===homeStyleKey?JSON.stringify(p):null})).toEqual(p);
 });
 it('rejects corrupt persisted choices',()=>{expect(()=>readHomeStyles({getItem:()=>'{broken'})).toThrow();});
 it('compares Windows canonical paths without weakening Unix identity',()=>{
  expect(sameLoginDirectory('\\\\?\\C:\\Users\\Me\\.claude-account1','c:/users/me/.claude-account1')).toBe(true);
  expect(sameLoginDirectory('/home/me/.claude-account1','/home/me/.claude-account2')).toBe(false);
  expect(sameLoginDirectory('/home/Me/.claude-account1','/home/me/.claude-account1')).toBe(false);
 });
});
