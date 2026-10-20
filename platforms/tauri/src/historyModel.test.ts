import {describe,it,expect} from 'vitest';
import {historyBounds,historyRange,summarizeHistory} from './historyModel';
import {desktopSchema} from './desktop';
import fixture from '../tests/fixtures/desktop.json';
describe('history date ranges and totals',()=>{
 const now=new Date(2026,9,20,1);
 it('uses local calendar days, including month boundaries',()=>{
  expect(historyBounds('1',now)).toEqual({start:'2026-10-20',end:'2026-10-20'});
  expect(historyBounds('yesterday',new Date(2026,9,1))).toEqual({start:'2026-09-30',end:'2026-09-30'});
  expect(historyBounds('30',now)).toEqual({start:'2026-09-21',end:'2026-10-20'});
 });
 it('filters before summing, and preserves unknown cost',()=>{
  const {accounts}=desktopSchema.parse(fixture);
  accounts[0].history.push({date:'2026-09-20',tokens:100000,cost:200,models:[]});
  const rows=historyRange(accounts,'claude','30',now);
  expect(summarizeHistory(rows)).toEqual({tokens:2400,cost:2.4});
  rows.forEach(row=>row.cost=null);
  expect(summarizeHistory(rows)).toEqual({tokens:2400,cost:null});
 });
 it('does not double count shared device logs across accounts',()=>{
  const {accounts}=desktopSchema.parse(fixture);
  accounts.forEach(a=>a.historyScope='device');
  expect(summarizeHistory(historyRange(accounts,'claude','1',now))).toEqual({tokens:1200,cost:1.2});
 });
});
