import {describe,it,expect} from 'vitest';
import fixture from '../tests/fixtures/desktop.json';
import {desktopSchema,trayAccounts,historyRows} from './desktop';
describe('desktop account contract',()=>{
 it('keeps order and renumbers only visible accounts in either style',()=>{
  const s=desktopSchema.parse(fixture);
  s.accounts.splice(1,0,{...s.accounts[0],id:'claude:removed',enabled:false});
  expect(trayAccounts(s.accounts).map(a=>[a.id,a.badge])).toEqual([['claude',1],['claude:third',2],['codex',null]]);
  s.accounts[0].tray=false;
  expect(trayAccounts(s.accounts).map(a=>a.badge)).toEqual([null,null]);
 });
 it('preserves account history but deduplicates explicitly device-scoped logs',()=>{
  const s=desktopSchema.parse(fixture);
  expect(historyRows(s.accounts,'claude')).toHaveLength(2);
  s.accounts.forEach(a=>a.historyScope='device');
  expect(historyRows(s.accounts,'claude')).toHaveLength(1);
 });
 it('permits all metrics off home without changing other accounts',()=>{
  const s=desktopSchema.parse(fixture);s.accounts[0].metrics.forEach(m=>m.placement='details');
  expect(desktopSchema.parse(s).accounts[0].metrics.filter(m=>m.placement==='home')).toHaveLength(0);
  expect(s.accounts[1].metrics.filter(m=>m.placement==='home')).toHaveLength(2);
 });
 it('strips credentials and rejects nonfinite amounts',()=>{
  const s=desktopSchema.parse({...fixture,accessToken:'secret',accounts:fixture.accounts.map(a=>({...a,refreshToken:'secret'}))});
  expect(JSON.stringify(s)).not.toContain('secret');s.accounts[0].metrics[0].percent=Infinity;
  expect(()=>desktopSchema.parse(s)).toThrow();
 });
});
