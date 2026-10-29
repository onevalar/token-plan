import {describe,it,expect} from 'vitest';
import {activityDays,sourceParts,treeRects,readStatistics,defaultStatistics,quotaSeries} from './statisticsModel';
import {historyRows,type Account} from './desktop';
import {statisticsView,canCompare,statisticsCopy} from './statisticsData';
import {dateKey} from './historyModel';
const account=(id:string):Account=>({id,family:'claude',name:'Claude',email:id,historyScope:'device',history:[{date:'2026-10-25',tokens:100,cost:null,models:[]}],observations:[]} as unknown as Account);
describe('statistics data integrity',()=>{
 it('keeps missing dates distinct from recorded zeros and deduplicates device logs',()=>{
  const a=account('a'),b=account('b');const rows=historyRows([a,b],'all');expect(sourceParts(rows)).toEqual([{label:'Claude',value:100}]);
  const days=activityDays(rows,'30',new Date('2026-10-25T12:00:00'));expect(days.filter(d=>d.value===null)).toHaveLength(29);expect(days.at(-1)?.value).toBe(100);
  a.history[0].tokens=0;expect(activityDays(historyRows([a],'all'),'1',new Date('2026-10-25T12:00:00'))[0].value).toBe(0);
 });
 it('treemap areas preserve proportions without inflating tiny parts',()=>{
  const parts=[{label:'A',value:90},{label:'B',value:9},{label:'C',value:1}],rects=treeRects(parts);
  for(const r of rects)expect(r.w*r.h/6000).toBeCloseTo(r.value/100,10);
 });
 it('validates persisted modules and styles',()=>{
  const p=defaultStatistics();expect(readStatistics(JSON.stringify(p))).toEqual(p);
  expect(()=>readStatistics(JSON.stringify({...p,order:['activity','activity','quota','records']}))).toThrow();
  expect(()=>readStatistics(JSON.stringify({...p,styles:{...p.styles,quota:'Source Treemap'}}))).toThrow();
 });
 it('retains legacy module order, visibility and styles when adding new categories',()=>{
  const old={order:['records','sources','activity','quota'],enabled:{records:true,sources:false,activity:true,quota:false},styles:{records:'',sources:'Source Treemap',activity:'Folded Bands',quota:'Observation List'}};
  const migrated=readStatistics(JSON.stringify(old));
  expect(migrated.order).toEqual(['overview','records','sources','activity','quota','comparison','budget']);
  expect(migrated.enabled).toEqual({overview:true,...old.enabled,comparison:false,budget:false});
  expect(migrated.styles).toMatchObject(old.styles);
  expect(readStatistics(JSON.stringify(migrated))).toEqual(migrated);
 });
 it('never invents quota observations from token history',()=>expect(quotaSeries([account('a')],'30')).toEqual([]));
});

describe('recorded statistics across equal periods',()=>{
 const now=new Date(2026,9,1,12);
 const series=(family:string,currentTokens:number,previousTokens:number,currentCost:number,previousCost:number):Account=>({...account(family),family,name:family,history:Array.from({length:14},(_,index)=>{
  const day=new Date(now);day.setDate(day.getDate()-index);
  return {date:dateKey(day),tokens:index<7?currentTokens:previousTokens,cost:index<7?currentCost:previousCost,models:[]};
 })});
 const records=()=>[series('claude',300,100,.0015,.0025),series('codex',30,50,.0055,.0035)];
 it('uses nonoverlapping calendar periods and counts shared device data once',()=>{
  const [a,b]=records(),view=statisticsView([a,{...a,id:'second'},b],'7',now);
  expect(view.bounds).toEqual({start:'2026-09-25',end:'2026-10-01'});
  expect(view.priorBounds).toEqual({start:'2026-09-18',end:'2026-09-24'});
  expect(view.total).toMatchObject({tokens:2310,records:14,knownCosts:14});
  expect(view.total.cost).toBeCloseTo(.049,12);
  expect(view.previous.tokens).toBe(1050);expect(view.previous.cost).toBeCloseTo(.042,12);
  expect(view.sources.map(source=>source.tokens)).toEqual([2100,210]);
  expect(view.sourceCount).toBe(2);expect(view.days).toHaveLength(7);expect(view.previousDays).toHaveLength(7);
  expect(canCompare(view,'tokens')).toBe(true);expect(canCompare(view,'cost')).toBe(true);
  const yesterday=statisticsView([a],'yesterday',now);
  expect(yesterday.bounds).toEqual({start:'2026-09-30',end:'2026-09-30'});
  expect(yesterday.priorBounds).toEqual({start:'2026-09-29',end:'2026-09-29'});
 });
 it('does not mistake seven covered dates for complete records from every source',()=>{
  const [a,b]=records();b.history.shift();
  const view=statisticsView([a,b],'7',now);
  expect(view.covered).toBe(7);expect(view.days.at(-1)).toMatchObject({tokens:300,incomplete:true});
  expect(view.partial).toBe(true);expect(canCompare(view,'tokens')).toBe(false);expect(canCompare(view,'cost')).toBe(false);
  b.history=b.history.slice(0,6);
  const noPrior=statisticsView([a,b],'7',now);
  expect(noPrior.previousCovered).toBe(7);expect(noPrior.previousPartial).toBe(true);
 });
 it('keeps unknown costs separate from missing days and real zero totals',()=>{
  const [a,b]=records();b.history[0].cost=null;
  const partial=statisticsView([a,b],'7',now);
  expect(partial.total.cost).toBeCloseTo(.0435,12);expect(partial.costComplete).toBe(false);
  expect(canCompare(partial,'tokens')).toBe(true);expect(canCompare(partial,'cost')).toBe(false);
  for(const row of a.history)row.cost=null;
  expect(statisticsView([a],'7',now).total.cost).toBeNull();
  for(const row of a.history){row.tokens=0;row.cost=0;}
  const zero=statisticsView([a],'7',now);
  expect(zero.total.tokens).toBe(0);expect(zero.total.cost).toBe(0);expect(canCompare(zero,'cost')).toBe(true);
  const empty=statisticsView([],'7',now);
  expect(empty.total.tokens).toBeNull();expect(empty.total.cost).toBeNull();expect(canCompare(empty,'tokens')).toBe(false);
  expect(empty.sources).toEqual([]);
  expect(statisticsCopy('en').money(.000006)).toBe('$0.000006');
 });
 it('retains independent account records and refuses partial-history comparisons',()=>{
  const [a]=records(),second={...a,id:'separate',historyScope:'account' as const,history:a.history.map(row=>({...row,tokens:4,cost:.01}))};
  const view=statisticsView([{...a,historyScope:'account'},second],'7',now);
  expect(view.total.tokens).toBe(2128);expect(view.sourceCount).toBe(2);expect(view.sources).toHaveLength(1);
  expect(canCompare(view,'tokens')).toBe(true);
  expect(canCompare(statisticsView([{...a,historyPartial:true}],'7',now),'tokens')).toBe(false);
 });
});

import {collectQuotaSamples,withQuotaSamples} from './preview/useQuotaSamples';
it('records actual fetch timestamps, skips failed refreshes and clears changed identities',()=>{
 const now=Date.parse('2026-10-25T12:00:00Z'),a={...account('a'),fetchedAt:new Date(now-60000).toISOString(),metrics:[{label:'Session',hasData:true,percent:40,chart:[]}]} as unknown as Account;
 const first=collectQuotaSamples({},[a],now);expect(first.a.points[0]).toMatchObject({date:a.fetchedAt,value:40});
 expect(collectQuotaSamples(first,[{...a,error:'expired',fetchedAt:new Date(now).toISOString()}],now)).toEqual(first);
 expect(collectQuotaSamples(first,[{...a,email:'new',error:'expired'}],now).a.points).toEqual([]);
 expect(collectQuotaSamples(first,[],now)).toEqual({});
 expect(withQuotaSamples([a],first)[0].observations).toHaveLength(1);
});
