import {describe,it,expect} from 'vitest';
import fixture from '../tests/fixtures/desktop.json';
import {desktopSchema,trayAccounts,historyRows} from './desktop';
import {trayTrends} from './trayTrend';
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
 it('accepts persisted native menu styles without changing selected metrics',()=>{
  for(const trayStyle of ['ring','percentage','sparkline']){
   const s=desktopSchema.parse({...fixture,settings:{...fixture.settings,trayStyle}});
   expect(s.settings.trayStyle).toBe(trayStyle);expect(s.accounts[0].metrics.map(m=>m.pinned)).toEqual([true,false]);
  }
 });
 it('keeps real daily tokens on calendar slots, including zero and both range boundaries',()=>{
  const s=desktopSchema.parse(fixture),a=s.accounts[0],now=new Date(2026,9,24,12).getTime();
  a.history=[['2026-10-24',12500],['2026-10-11',0],['2026-10-12',100],['2026-10-14',25],['2026-10-10',999999],['2026-10-25',888888]].map(([date,tokens])=>({date:String(date),tokens:Number(tokens),cost:null,models:[]}));
  a.metrics[0].chart=[{label:'undated quota sample',value:99}];a.observations=[{date:'2026-10-24T12:00:00Z',label:'Session',value:99,unit:'percent'}];
  const before=trayTrends(s.accounts,now).get(a.id)!;
  expect(before.dates[0]).toBe('2026-10-11');expect(before.dates[13]).toBe('2026-10-24');
  expect(before.values).toEqual([0,100,null,25,null,null,null,null,null,null,null,null,null,12500]);
  a.metrics[0].percent=100-a.metrics[0].percent!;s.settings.showRemaining=true;
  expect(trayTrends(s.accounts,now).get(a.id)).toEqual(before);
  expect(trayTrends(s.accounts,new Date(2026,9,25,1).getTime()).get(a.id)!.values.at(-2)).toBe(12500);
 });
 it('never plots invalid or duplicate records as zero or double counts',()=>{
  const s=desktopSchema.parse(fixture),a=s.accounts[0];
  a.history=[['2026-10-24',5],['2026-10-24',9],['2026-10-23',-1],['2026-10-22',0],['2026-02-30',7],['2026-10-21',1.5],['2026-10-20',Number.MAX_SAFE_INTEGER+1]].map(([date,tokens])=>({date:String(date),tokens:Number(tokens),cost:null,models:[]}));
  const trend=trayTrends(s.accounts,new Date(2026,9,24,12).getTime()).get(a.id)!;
  expect(trend.invalid).toBe(true);expect(trend.values.filter(v=>v!=null)).toEqual([0]);expect(trend.values.at(-1)).toBeNull();
 });
 it('deduplicates device history only among visible accounts with selected metrics and usable records',()=>{
  const s=desktopSchema.parse(fixture),now=new Date(2026,9,24,12).getTime();s.accounts=s.accounts.slice(0,2);
  expect(trayTrends(s.accounts,now).size).toBe(2);
  s.accounts.forEach(a=>a.historyScope='device');
  expect([...trayTrends(s.accounts,now).keys()]).toEqual(['claude']);
  for(const field of ['enabled','tray'] as const){s.accounts[0][field]=false;expect([...trayTrends(s.accounts,now).keys()]).toEqual(['claude:third']);s.accounts[0][field]=true;}
  s.accounts[0].metrics.forEach(m=>m.pinned=false);
  expect([...trayTrends(s.accounts,now).keys()]).toEqual(['claude:third']);
  s.accounts[0].metrics[0].pinned=true;s.accounts[0].history=[];
  expect(trayTrends(s.accounts,now).get('claude:third')!.values[9]).toBe(1200);
 });
});
