import {describe,it,expect} from 'vitest';
import {activityDays,sourceParts,treeRects,readStatistics,defaultStatistics,quotaSeries} from './statisticsModel';
import {historyRows,type Account} from './desktop';
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
 it('never invents quota observations from token history',()=>expect(quotaSeries([account('a')],'30')).toEqual([]));
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
