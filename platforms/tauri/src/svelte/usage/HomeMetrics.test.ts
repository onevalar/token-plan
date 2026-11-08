import {describe,it,expect} from 'vitest';
import {render} from 'svelte/server';
import HomeMetrics from './HomeMetrics.svelte';
import Dashboard,{accountGroups,dashboardGroups,modelShares,problemAction} from '../Dashboard.svelte';
import {homeQuotaDesigns,preciseQuotaReading,quotaMeter} from '../../homeUsage';
import {metricName,metricAmount,isQuotaMetric,usageTone,windowDescription} from '../../metric';
import {textureAt,textures,tintStyle} from '../../texture';
import type {Account,Metric} from '../../desktop';

const now=Date.parse('2026-10-28T08:00:00Z');
const quota:Metric={id:'session',label:'Session',placement:'home',pinned:false,pinnable:true,hasData:true,notStarted:false,unit:'percent',percent:38,amount:null,periodSeconds:18000,resetsAt:new Date(now+10800000).toISOString(),values:[],chart:[],expiries:[]};
const reading={now,language:'en',missing:'No data'};
const htmlFor=(style:string,metrics:Metric[],remaining=false)=>render(HomeMetrics,{props:{style,metrics,remaining,...reading}}).body.replace(/<!--.*?-->/gs,'');
const text=(html:string)=>html.replace(/<[^>]+>/g,'');
const account=(id:string,family:string,enabled=true):Account=>({id,family,enabled,name:family,email:`${id}@example.com`,plan:'Pro',tray:true,removable:true,apiKey:false,apiKeyStatus:'notSet',note:'',error:'',fetchedAt:'',metrics:[quota],loginDirectories:[],observations:[],historyScope:'account',historyPartial:false,history:[]});

describe('pure metric and texture extractions',()=>{
 it('keeps period names, Orb, amounts and warning thresholds',()=>{
  expect(metricName(quota,'en')).toBe('5h');
  expect(metricName({...quota,label:'Sonnet Weekly',periodSeconds:604800},'en')).toBe('Sonnet · 1w');
  expect(windowDescription(10800,'en')).toBe('3-hour window');
  expect(windowDescription(null,'en')).toBeUndefined();
  expect(metricAmount({...quota,unit:'dollars',amount:7.25,values:[]},'en','No data')).toBe('$7.25');
  expect(metricAmount({...quota,hasData:false,statusText:'Ready'},'en','No data')).toBe('No data');
  expect(metricAmount({...quota,label:'Credits',amount:1.23456},'en','No data')).toBe('1.2346');
  expect(isQuotaMetric({...quota,chart:[{label:'Today',value:1}]})).toBe(false);
  expect(usageTone(79.6,false)).toBe('normal');expect(usageTone(80,false)).toBe('critical');
  expect(usageTone(20.4,true)).toBe('normal');expect(usageTone(20,true)).toBe('critical');
  expect(textures.map((_,i)=>textureAt('mixed',i))).toEqual([...textures]);
  expect(textureAt('mixed',4)).toBe('dither');expect(tintStyle('provider')).toEqual({'--texture-tint':undefined});
 });
});

describe('Svelte dashboard contract',()=>{
 it('groups only enabled accounts and puts all OpenAI at the first visible OpenAI position',()=>{
  const accounts=[account('a','claude'),account('c','codex'),account('b','cursor'),account('o','openai'),account('off','codex',false),account('d','claude')];
  expect(accountGroups(accounts).map(g=>g.accounts.map(a=>a.id))).toEqual([['a'],['c'],['b'],['o'],['d']]);
  expect(dashboardGroups(accounts).map(g=>[g.openAI,g.accounts.map(a=>a.id)])).toEqual([[false,['a']],[true,['c','o']],[false,['b','d']]]);
  const html=render(Dashboard,{props:{accounts,open:()=>{},openSettings:()=>{},retry:()=>{},remaining:false,...reading}}).body;
  expect(html).not.toContain('off@example.com');expect(html.match(/class="openai-group service-group"/g)).toHaveLength(1);
 });
 it('uses the latest seven days and positive token shares only',()=>{
  const history=Array.from({length:8},(_,i)=>({date:`2026-10-${String(20+i).padStart(2,'0')}`,tokens:10,cost:null,models:[{model:i===0?'excluded':'A',tokens:10,cost:null,variants:[]}]}));
  expect(modelShares(history)).toEqual([{name:'A',share:1}]);expect(modelShares([])).toEqual([]);
 });
 it('routes API-key problems to settings and has no recovery for warning-only accounts',()=>{
  const calls:string[]=[],run={open:(id:string)=>calls.push(`open:${id}`),settings:(id:string)=>calls.push(`settings:${id}`),retry:(id:string)=>calls.push(`retry:${id}`)};
  const a={...account('a','openai'),apiKey:true,error:'Invalid API key'};
  const action=problemAction(a,run);expect(action?.label).toBe('Set API Key');action?.run();expect(calls).toEqual(['settings:a']);
  expect(problemAction({...a,error:'',warning:'Stale'},run)).toBeNull();
 });
});

describe('native quota rendering',()=>{
 it.each(Object.keys(homeQuotaDesigns))('%s preserves precise, bounded, unknown and mixed readings',style=>{
  for(const remaining of [false,true]){
   for(const used of [0,.4,79.6,80,100,112,-12]){
    const value=remaining?Number((100-used).toFixed(8)):used,m={...quota,percent:value};
    const r=preciseQuotaReading({metric:m,remaining,...reading}),html=htmlFor(style,[m],remaining);
    expect(text(html.match(/<span class="hq-value[^>]*>(.*?)<\/span>/s)![1])).toBe(`${value}%`);
    expect(html).toContain(`data-used="${r.used}"`);expect(html).toContain(`data-tone="${used>=80?'critical':'normal'}"`);
    const encoded=Number(html.match(/aria-valuenow="([^"]+)"/)![1]);
    expect(encoded).toBeCloseTo(Math.max(0,Math.min(100,style==='numbers:spread'?used:value)),8);
    expect(quotaMeter(r)['aria-valuetext']).toBe(r.description);
   }
   const metrics=[{...quota,id:'first'}, {...quota,id:'balance',unit:'dollars',percent:null,periodSeconds:null,amount:7.25}, {...quota,id:'missing',hasData:false}, {...quota,id:'null',percent:null}];
   const html=htmlFor(style,metrics,remaining);
   expect([...html.matchAll(/data-metric="([^"]+)"/g)].map(m=>m[1])).toEqual(metrics.map(m=>m.id));
   expect(html).toContain('$7.25');expect(text(html)).toContain('No data');expect(html.match(/role="meter"/g)).toHaveLength(1);
  }
 });
 it.each(['bars','bars:forecast','gauges','cells','ticks','rings','concentric','ruler','ruler:forecast','numbers','segments','segments:rising:5','segments:capsule:10','vessel','vessel:tank','vessel:hourglass','vessel:thermometer','frame','sources','columns','signal','rowfill','texturebar:card:mixed:purple','texturebar:half:solid:green','texturebar:row:hatch'])('keeps saved %s renderable with missing and nonquota rows',style=>{
  const html=htmlFor(style,[quota,{...quota,id:'missing',hasData:false},{...quota,id:'balance',unit:'dollars',amount:7.25,periodSeconds:null,percent:null}]);
  expect(text(html)).toContain('38%');expect(text(html)).toContain('$7.25');expect(text(html)).toContain('No data');
 });
 it('uses one named TickMeter with bounded ARIA and an unbounded quota readout',()=>{
  const html=htmlFor('ticks',[{...quota,percent:112}]);
  expect(html.match(/role="meter"/g)).toHaveLength(1);
  expect(html).toContain('data-slot="tick-meter"');expect(html).toContain('aria-label="5h · Used"');
  expect(html).toContain('aria-valuenow="100"');expect(html).toContain('112%');
 });
 it('uses reusable Valar TextureFill in each textured layout',()=>{
  for(const style of ['texturebar:row:hatch','texturebar:half:halftone','texturebar:card:lines']){
   const html=htmlFor(style,[quota]);
   expect(html).toContain('data-slot="texture-fill"');expect(text(html)).toContain('38%');
  }
 });
 it('keeps fractional fixed-denominator fills, including under 1%',()=>{
  for(const [style,count] of [['cells:dots',100],['cells:grille',40],['vessel:chambers',10]] as const){
   for(const value of [0,.4,38,79.6,112,-12]){
    const html=htmlFor(style,[{...quota,percent:value}]);
    const pattern=style==='vessel:chambers'?/data-fraction="([^"]+)"/g:/transform:\s*scaleX\(([^)]+)\)/g;
    const fractions=[...html.matchAll(pattern)].map(m=>Number(m[1]));
    expect(fractions).toHaveLength(count);expect(fractions.reduce((sum,n)=>sum+n,0)).toBeCloseTo(Math.max(0,Math.min(100,value))*count/100,8);
   }
  }
 });
 it('pairs only adjacent independent windows and preserves reset/expiry status',()=>{
  const weekly={...quota,id:'weekly',periodSeconds:604800};
  expect(htmlFor('concentric',[quota,weekly])).toContain('home-concentric');
  expect(htmlFor('concentric',[quota,{...weekly,periodSeconds:quota.periodSeconds}])).not.toContain('class="home-concentric"');
  const html=htmlFor('numbers:ticket',[{...quota,notStarted:true,expiries:['2026-10-30T03:01:06Z']}]);
  expect(text(html)).toContain('Not started');expect(text(html)).toContain('2026');
 });
});
