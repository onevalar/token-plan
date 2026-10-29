import {renderToStaticMarkup} from 'react-dom/server';
import {describe,expect,it} from 'vitest';
import {accountSchema,type Account} from '../desktop';
import {dateKey} from '../historyModel';
import {statisticsView,type StatisticsChartProps,type StatisticsMeasure,type StatisticsRange} from '../statisticsData';
import {StatisticsTime} from './StatisticsTime';
import {StatisticsCompare} from './StatisticsCompare';

const now=new Date('2026-10-29T12:00:00');
function record(offset:number,tokens=100,cost:number|null=.004567):Account['history'][number] {
 const date=new Date(now);date.setDate(date.getDate()+offset);
 return {date:dateKey(date),tokens,cost,models:[]};
}
function account(id:string,history:Account['history'],family=id):Account {
 return accountSchema.parse({id,family,name:family,email:id,plan:'',enabled:true,tray:false,removable:true,apiKey:false,
  note:'',error:'',fetchedAt:'',metrics:[],history});
}
const complete=(id:string,length=7)=>account(id,Array.from({length:length*2},(_,index)=>record(index-length*2+1,index+1,(index+1)*.0001234)));
function props(accounts:Account[],range:StatisticsRange='7',measure:StatisticsMeasure='cost'):StatisticsChartProps {
 return {view:statisticsView(accounts,range,now),variant:0,measure,language:'en',day:null,onDay:()=>{},selected:null,onSelect:()=>{}};
}
const time=(input:StatisticsChartProps,variant=0)=>renderToStaticMarkup(<StatisticsTime {...input} variant={variant}/>);
const compare=(input:StatisticsChartProps,variant=0)=>renderToStaticMarkup(<StatisticsCompare {...input} variant={variant}/>);
const marks=(html:string,className:string)=>[...html.matchAll(new RegExp(`<[^>]*class="${className}"[^>]*>`,'g'))].map(match=>match[0]);
const data=(tag:string,name:string)=>tag.match(new RegExp(`data-${name}="([^"]+)"`))?.[1];
const path=(html:string,className:string)=>html.match(new RegExp(`<path d="([^"]*)" class="${className}"`))?.[1];

describe('production statistics time and comparison charts',()=>{
 it.each(['1','7','30'] as const)('renders all six layouts for %s days without duplicating the overview hero',range=>{
  const input=props([complete('claude',Number(range))],range);
  for(const measure of ['tokens','cost'] as const)for(const variant of [0,1,2]) {
   const daily=time({...input,measure},variant),periods=compare({...input,measure},variant);
   expect(daily).not.toContain('tp-hero');
   expect(daily).toContain('data-testid="day-readout"');
   expect(periods).toContain('class="tp-compare-totals"');
   expect(daily+periods).not.toMatch(/NaN|Infinity/);
  }
 });

 it('retains fractional cents in every delta and reconciles unrounded source totals',()=>{
  const input=props(['claude','codex'].map(id=>account(id,[record(-1,10,.001234),record(0,20,.004567)])),'1');
  const html=compare(input,2),steps=marks(html,'tp-compare-step-space'),contributions=marks(html,'tp-compare-contribution-value');
  expect(html).toContain('class="tp-compare-waterfall"');
  expect(steps).toHaveLength(4);
  expect(contributions.map(tag=>Number(data(tag,'delta')))).toEqual([.004567-.001234,.004567-.001234]);
  expect(contributions.reduce((sum,tag)=>sum+Number(data(tag,'delta')),0)).toBeCloseTo(input.view.total.cost!-input.view.previous.cost!,14);
  expect(Number(data(steps.at(-2)!,'to'))).toBeCloseTo(input.view.total.cost!,14);
  expect(html).toContain('+$0.003333');
  expect(compare(input)).toContain(`data-delta="${.004567-.001234}"`);
 });

 it('accepts harmless grouping-order error for nine sources with 30 days of micro-cost records',()=>{
  const input=props(Array.from({length:9},(_,index)=>complete(`source-${index}`,30)),'30');
  const html=compare(input,2),steps=marks(html,'tp-compare-step-space');
  expect(input.view.sources.reduce((sum,source)=>sum+source.cost!,0)).not.toBe(input.view.total.cost);
  expect(html).toContain('class="tp-compare-waterfall"');
  expect(html).toContain('--step-count:11');
  expect(marks(html,'tp-compare-contribution-value')).toHaveLength(9);
  expect(steps).toHaveLength(11);
  expect(Number(data(steps.at(-2)!,'to'))).toBeCloseTo(input.view.total.cost!,12);
 });

 it.each([.0001,1e-12])('does not hide a genuine %s cost discrepancy with cent rounding or a broad absolute epsilon',difference=>{
  const input=props([complete('claude')]);
  input.view.total.cost!+=difference;
  const html=compare(input,2);
  expect(html).not.toContain('class="tp-compare-waterfall"');
  expect(html).toContain('Source records do not reconcile with the period totals.');
 });

 it('distinguishes a missing day, recorded zero, unknown cost, and a known cost subtotal',()=>{
  const input=props([
   account('a',[record(-5,0,0),record(-4,10,null),record(-3,20,.002),record(-2,30,.003)]),
   account('b',[record(-5,0,0),record(-4,10,null),record(-3,20,null),record(-2,30,.003)]),
  ]);
  for(const variant of [0,1]) {
   const html=time(input,variant);
   for(const [offset,kind] of [[-6,'missing'],[-5,'zero'],[-4,'unknown'],[-3,'partial'],[-2,'known']] as const) {
    const tag=html.match(new RegExp(`<[^>]*data-date="${record(offset).date}"[^>]*>`))?.[0]??'';
    expect(data(tag,'kind')).toBe(kind);
   }
  }
  expect(time({...input,measure:'tokens'})).toContain(`data-date="${record(-4).date}" data-kind="known"`);
 });

 it.each([-2,-9])('treats an absent owner on day %s as a lower bound only in the affected period',missing=>{
  const a=complete('a'),b=complete('b');b.history=b.history.filter(day=>day.date!==record(missing).date);
  const input=props([a,b],'7','tokens'),html=time(input,2),currentMissing=missing>=-6;
  expect(input.view.covered).toBe(7);expect(input.view.previousCovered).toBe(7);
  expect(html).toContain(`data-period="current" data-lower-bound="${currentMissing}"`);
  expect(html).toContain(`data-period="previous" data-lower-bound="${!currentMissing}"`);
  expect(compare(input)).not.toContain('class="tp-compare-join"');
  expect(compare(input,2)).not.toContain('class="tp-compare-waterfall"');
  if(currentMissing)expect(time(input)).toContain(`data-date="${record(missing).date}" data-kind="partial"`);
 });

 it('does not mark token accumulation as partial merely because a recorded cost is unknown',()=>{
  const a=complete('a');a.history.find(day=>day.date===record(-2).date)!.cost=null;
  const input=props([a]);
  expect(input.view.partial).toBe(false);expect(input.view.previousPartial).toBe(false);
  expect(time(input,2)).toContain('data-period="current" data-lower-bound="true"');
  expect(time({...input,measure:'tokens'},2)).toContain('data-period="current" data-lower-bound="false"');
  expect(compare({...input,measure:'tokens'},2)).toContain('class="tp-compare-waterfall"');
  expect(compare(input,2)).not.toContain('class="tp-compare-waterfall"');
 });

 it('retains gaps in both cumulative paths and per-source daily trends',()=>{
  const a=complete('a');a.history=a.history.filter(day=>day.date!==record(-3).date);
  const input=props([a]),daily=time(input,2),trends=compare(input,1);
  const current=daily.match(/class="tp-time-line-current"><path d="([^"]*)"/)?.[1];
  expect(current?.match(/M/g)).toHaveLength(2);
  expect(path(trends,'tp-compare-current-line')?.match(/M/g)).toHaveLength(2);
  expect(daily).toContain('data-period="current" data-lower-bound="true"');
 });

 it('does not invent a previous period when only current records exist',()=>{
  const input=props([account('claude',Array.from({length:7},(_,index)=>record(index-6)))]);
  expect(compare(input)).not.toContain('class="tp-compare-prior-point"');
  expect(compare(input,2)).not.toContain('class="tp-compare-waterfall"');
  expect(time(input,2)).toContain('class="tp-time-line-prior"><path d=""');
  expect(time(input,2)).toContain('Cumulative Unknown');
 });

 it('draws no fabricated cost curves when every recorded cost is unknown',()=>{
  const a=complete('claude');a.history.forEach(day=>day.cost=null);
  const input=props([a]),daily=time(input,2),trends=compare(input,1);
  expect(daily).toContain('No invented curve is drawn.');
  expect(daily).not.toContain('class="tp-time-plot-dot"');
  expect(time(input,1)).not.toContain('data-lit="true"');
  expect(path(trends,'tp-compare-current-line')).toBe('');
  expect(path(trends,'tp-compare-prior-line')).toBe('');
  expect(trends).not.toMatch(/class="tp-compare-(current|prior)-point"/);
  expect(compare(input,2)).not.toContain('class="tp-compare-waterfall"');
 });

 it.each(['tokens','cost'] as const)('keeps complete recorded zero %s totals comparable',measure=>{
  const a=complete('claude');a.history.forEach(day=>{day.tokens=0;day.cost=0;});
  const input=props([a],'7',measure),html=compare(input,2);
  expect(html).toContain('class="tp-compare-waterfall"');
  expect(html.match(/is-zero/g)).toHaveLength(3);
  expect(html).toContain('data-delta="0"');
  expect(time(input,2)).not.toContain('class="tp-time-no-trajectory"');
  expect(time(input)).toContain('data-kind="zero"');
 });

 it('renders single-day observations as isolated points, not invented trends',()=>{
  const input=props([complete('claude',1)],'1'),html=compare(input,1);
  expect(path(html,'tp-compare-current-line')).toMatch(/^M120,[\d.]+$/);
  expect(path(html,'tp-compare-prior-line')).toMatch(/^M120,[\d.]+$/);
  expect(html).toContain('One day is a point, not a trend.');
  expect(time(input,2).match(/class="tp-time-plot-dot"/g)).toHaveLength(2);
 });

 it.each(['en','zh-Hans','zh-Hant','ja','ko'])('uses Intl calendar dates and weekdays for %s',language=>{
  const input={...props([complete('claude')]),language},html=time(input);
  const monday=new Date(2024,0,1).toLocaleDateString(language,{weekday:'long'});
  expect(html).toContain(`aria-label="${monday}"`);
  expect(html).toContain(new Intl.DateTimeFormat(language,{month:'long',year:'numeric'}).format(now));
 });

 it.each(['1','7','30'] as const)('handles %s days with no history or sources',range=>{
  const input=props([],range);
  for(const variant of [0,1,2]) {
   expect(time(input,variant)).not.toMatch(/NaN|Infinity/);
   expect(compare(input,variant)).not.toContain('class="tp-compare-waterfall"');
   expect(compare(input,variant)).not.toContain('data-source=');
  }
 });
});
