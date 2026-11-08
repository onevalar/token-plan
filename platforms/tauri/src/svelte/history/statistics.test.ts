import {render} from 'svelte/server';
import {afterEach,describe,expect,it,vi} from 'vitest';
import {accountSchema,type Account} from '../../desktop';
import {dateKey} from '../../historyModel';
import {statisticsView,type StatisticsChartProps,type StatisticsMeasure,type StatisticsRange} from '../../statisticsData';
import StatisticsTime from './StatisticsTime.svelte';
import StatisticsCompare from './StatisticsCompare.svelte';
import HistoryModelBreakdown from './HistoryModelBreakdown.svelte';
import {costReferenceKey,createCostReference,readCostReferences,validCostReference} from './costReference.svelte';

const now=new Date('2026-10-29T12:00:00');
function record(offset:number,tokens=100,cost:number|null=.004567):Account['history'][number]{const date=new Date(now);date.setDate(date.getDate()+offset);return {date:dateKey(date),tokens,cost,models:[]};}
function account(id:string,history:Account['history']):Account{return accountSchema.parse({id,family:id,name:id,email:id,plan:'',enabled:true,tray:false,removable:true,apiKey:false,note:'',error:'',fetchedAt:'',metrics:[],history});}
const complete=(id:string,length=7)=>account(id,Array.from({length:length*2},(_,index)=>record(index-length*2+1,index+1,(index+1)*.0001234)));
function props(accounts:Account[],range:StatisticsRange='7',measure:StatisticsMeasure='cost'):StatisticsChartProps{return {view:statisticsView(accounts,range,now),variant:0,measure,language:'en',day:null,onDay:()=>{},selected:null,onSelect:()=>{}};}
const time=(input:StatisticsChartProps,variant=0)=>render(StatisticsTime,{props:{...input,variant}}).body.replace(/<!--.*?-->/gs,'');
const compare=(input:StatisticsChartProps,variant=0)=>render(StatisticsCompare,{props:{...input,variant}}).body.replace(/<!--.*?-->/gs,'');
const tags=(html:string,className:string)=>[...html.matchAll(new RegExp(`<[^>]*class="${className}"[^>]*>`,'g'))].map(match=>match[0]);
const data=(tag:string,name:string)=>tag.match(new RegExp(`data-${name}="([^"]+)"`))?.[1];
afterEach(()=>{vi.unstubAllGlobals();vi.restoreAllMocks();});

describe('native statistics public readings',()=>{
 it.each(['1','7','30'] as const)('renders all time/comparison layouts for %s days without invented values',range=>{
  for(const accounts of [[],[complete('claude',Number(range))]])for(const measure of ['tokens','cost'] as const)for(const variant of [0,1,2]){
   const input=props(accounts,range,measure),daily=time(input,variant),periods=compare(input,variant);
   expect(daily).not.toContain('tp-hero');expect(daily).toContain('data-testid="day-readout"');
   expect(periods).toContain('class="tp-compare-totals"');expect(daily+periods).not.toMatch(/NaN|Infinity/);
   if(!accounts.length)expect(periods).not.toContain('class="tp-compare-waterfall"');
  }
 });
 it('keeps fractional cents unrounded in source changes and reconciles the waterfall',()=>{
  const input=props(['claude','codex'].map(id=>account(id,[record(-1,10,.001234),record(0,20,.004567)])),'1');
  const html=compare(input,2),steps=tags(html,'tp-compare-step-space'),contributions=tags(html,'tp-compare-contribution-value');
  expect(steps).toHaveLength(4);expect(contributions.map(tag=>Number(data(tag,'delta')))).toEqual([.004567-.001234,.004567-.001234]);
  expect(Number(data(steps.at(-2)!,'to'))).toBeCloseTo(input.view.total.cost!,14);expect(html).toContain('+$0.003333');
  for(const difference of [.0001,1e-12]){const changed=props([complete('claude')]);changed.view.total.cost!+=difference;expect(compare(changed,2)).not.toContain('class="tp-compare-waterfall"');}
  expect(compare(props(Array.from({length:9},(_,i)=>complete(`source-${i}`,30)),'30'),2)).toContain('--step-count:11');
 });
 it('distinguishes missing, recorded zero, unknown and partial days',()=>{
  const input=props([account('a',[record(-5,0,0),record(-4,10,null),record(-3,20,.002),record(-2,30,.003)]),account('b',[record(-5,0,0),record(-4,10,null),record(-3,20,null),record(-2,30,.003)])]);
  for(const variant of [0,1])for(const [offset,kind] of [[-6,'missing'],[-5,'zero'],[-4,'unknown'],[-3,'partial'],[-2,'known']] as const){const tag=time(input,variant).match(new RegExp(`<[^>]*data-date="${record(offset).date}"[^>]*>`))?.[0]??'';expect(data(tag,'kind')).toBe(kind);}
  expect(compare(input,2)).not.toContain('class="tp-compare-waterfall"');
 });
 it('keeps gaps and known lower bounds instead of interpolating cumulative or daily paths',()=>{
  const a=complete('a');a.history=a.history.filter(day=>day.date!==record(-3).date);const input=props([a]);
  const daily=time(input,2),trends=compare(input,1);
  expect(daily.match(/class="tp-time-line-current"><path d="([^"]*)"/)?.[1].match(/M/g)).toHaveLength(2);
  expect(trends.match(/<path d="([^"]*)" class="tp-compare-current-line"/)?.[1].match(/M/g)).toHaveLength(2);
  expect(daily).toContain('data-period="current" data-lower-bound="true"');expect(compare(input,2)).not.toContain('class="tp-compare-waterfall"');
 });
 it('does not draw unknown costs or confuse them with comparable zero totals',()=>{
  const a=complete('claude');a.history.forEach(day=>day.cost=null);const input=props([a]);
  expect(time(input,2)).toContain('No invented curve is drawn.');expect(time(input,2)).not.toContain('class="tp-time-plot-dot"');
  expect(time(input,1)).not.toContain('data-lit="true"');expect(compare(input,2)).not.toContain('class="tp-compare-waterfall"');
  expect(time({...input,measure:'tokens'},2)).toContain('data-period="current" data-lower-bound="false"');
  a.history.forEach(day=>{day.tokens=0;day.cost=0;});const zero=props([a]);
  expect(compare(zero,2)).toContain('class="tp-compare-waterfall"');expect(compare(zero,2).match(/is-zero/g)).toHaveLength(3);expect(time(zero)).toContain('data-kind="zero"');
 });
 it.each(['en','zh-Hans','zh-Hant','ja','ko'])('retains localized Intl calendar headings in %s',language=>{
  const html=time({...props([complete('claude')]),language});expect(html).toContain(new Date(2024,0,1).toLocaleDateString(language,{weekday:'long'}));expect(html).toContain(new Intl.DateTimeFormat(language,{month:'long',year:'numeric'}).format(now));
 });
});

describe('daily model and personal-reference boundaries',()=>{
 it('uses the recorded day/source denominator, with exact costs, variants and an unclassified remainder',()=>{
  const row={tokens:100,models:[{model:'A',tokens:60,cost:.0790645,variants:[{model:'Input',tokens:60,cost:.0790645}]}]};
  const html=render(HistoryModelBreakdown,{props:{row,language:'en'}}).body;
  expect(html).toContain('data-denominator="100"');expect(html).toContain('60%');expect(html).toContain('40%');expect(html).toContain('Unclassified Records');expect(html).toContain('$0.08');expect(html).toContain('not added again.');
  const zero=render(HistoryModelBreakdown,{props:{row:{...row,tokens:0,models:[{...row.models[0],tokens:0}]},language:'en'}}).body;
  expect(zero).toContain('history-model-exact');expect(zero).not.toContain('history-model-composition');
 });
 it('validates whole-dollar storage and preserves independent account/range references',()=>{
  const memory=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,value:string)=>memory.set(key,value)});
  expect(readCostReferences(null)).toEqual({});for(const value of ['[]','null','{"bad":-1}','{"bad":1.5}'])expect(()=>readCostReferences(value)).toThrow();
  for(const value of [-1,.5,1_000_001,NaN,Infinity])expect(validCostReference(value)).toBe(false);
  const all=createCostReference('all','30'),single=createCostReference('claude','30');
  expect(all.budget).toBe(0);expect(all.save(150)).toBe(true);expect(single.save(20)).toBe(true);expect(createCostReference('all','30').budget).toBe(150);expect(createCostReference('all','7').budget).toBe(0);
  expect(readCostReferences(memory.get(costReferenceKey)!)).toEqual({'["all","30"]':150,'["claude","30"]':20});expect(all.save(-1)).toBe(false);
 });
 it('reports storage failures and allows a later save to repair malformed device settings',()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});let raw='{bad',blocked=true;
  vi.stubGlobal('localStorage',{getItem:()=>raw,setItem:(_key:string,value:string)=>{if(blocked)throw new Error('Storage unavailable');raw=value;}});
  const reference=createCostReference('all','7');expect(reference.budget).toBe(0);expect(reference.error).toContain('Could not load');
  expect(reference.save(150)).toBe(false);expect(reference.error).toBe('Could not save. Try again.');expect(reference.saved).toBe(false);expect(log).toHaveBeenCalledTimes(2);
  blocked=false;expect(reference.save(150)).toBe(true);expect(reference.error).toBe('');expect(reference.saved).toBe(true);expect(readCostReferences(raw)).toEqual({'["all","7"]':150});
 });
});
