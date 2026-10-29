import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {homeStyleKey,readHomeStyles,homeStyleMode,homeStyleFor} from './useHomeUsageStyle';
import {sameLook,styleCategories,categoryOf,homeUsageFamilies,homeQuotaDesigns,parseStyle,canonicalStyle,styleOptions,variantLabel,preciseQuotaReading,quotaReading,quotaMeter,quotaCycle,quotaPercent} from '../homeUsage';
import {HomeMetrics} from '../HomeMetrics';
import type {Metric} from '../desktop';
import {sameLoginDirectory} from './AccountOnboarding';
describe('account style preferences',()=>{
 it('adds Instruments and Cycles while keeping every earlier saved style valid',()=>{
  expect(Object.keys(homeUsageFamilies)).toHaveLength(14);
  for(const old of ['bars','gauges','cells','rings','ruler','concentric','numbers','segments','ticks'])expect(parseStyle(old)).not.toBeNull();
  expect(parseStyle('segments')?.family).toBe('cells');expect(parseStyle('concentric')?.family).toBe('rings');
  expect(parseStyle('segments:capsule:10')).toMatchObject({shape:'capsule',count:10});
  expect(parseStyle('segments:capsule:7')).toBeNull();expect(parseStyle('vessel:tank')?.vessel).toBe('tank');expect(parseStyle('nope')).toBeNull();
  expect(canonicalStyle('segments')).toBe(canonicalStyle('segments:square:20'));
  expect(styleOptions('rings')[0].choices.map(c=>c.id)).toEqual(['rings','concentric','ticks']);
  // Textured Bar is one Bars variant; its layout, texture and colour are options with one spelling per look.
  expect(parseStyle('rowfill:dither')).toBeNull();expect(sameLook('rowfill','texturebar:card:solid')).toBe(true);expect(categoryOf('rowfill').styles).not.toContain('rowfill');expect(categoryOf('texturebar:half:hatch').id).toBe('bars');
  expect(parseStyle('texturebar')).toMatchObject({layout:'row',texture:'lines',tint:'provider'});
  expect(parseStyle('texturebar:card')).toMatchObject({layout:'card',texture:'dither'});
  for(const bad of ['texturebar:wide','texturebar:row:waves','texturebar:row:dither:provider','texturebar:row:dither:red','texturebar:row:dither:blue:x'])expect(parseStyle(bad)).toBeNull();
  expect(canonicalStyle('texturebar')).toBe(canonicalStyle('texturebar:row:lines'));
  const [layout,type,tint]=styleOptions('texturebar:half:halftone:green');
  expect(layout.choices.map(c=>c.id)).toEqual(['texturebar:card:halftone:green','texturebar:half:halftone:green','texturebar:row:halftone:green']);
  // Every saved look is one of its own layout choices, so the picker never falls back to the first layout.
  for(const id of ['texturebar','texturebar:row:hatch','texturebar:half:solid:blue','texturebar:card:mixed'])expect(styleOptions(id)[0].choices.filter(c=>sameLook(c.id,id))).toHaveLength(1);
  expect(type.choices.map(c=>c.id)).toEqual(['texturebar:half:dither:green','texturebar:half:lines:green','texturebar:half:halftone:green','texturebar:half:hatch:green','texturebar:half:solid:green','texturebar:half:mixed:green']);
  expect(tint.choices.map(c=>c.id)).toEqual(['texturebar:half:halftone','texturebar:half:halftone:blue','texturebar:half:halftone:green','texturebar:half:halftone:orange','texturebar:half:halftone:purple']);
 });
 it('groups all existing renderers without losing saved variants',()=>{
  expect(styleCategories).toHaveLength(10);
  for(const c of styleCategories){expect(c.styles.length).toBeGreaterThanOrEqual(1);for(const id of c.styles)expect(categoryOf(id).id).toBe(c.id);}
  for(const id of Object.keys(homeUsageFamilies))expect(categoryOf(id).styles.some(s=>s===id)).toBe(true);
 });
 it('makes all fifteen approved looks reachable without merging them into older renderers',()=>{
  expect(Object.keys(homeQuotaDesigns)).toHaveLength(15);
  const choices=styleCategories.flatMap(c=>[...c.styles]);
  for(const [id,design] of Object.entries(homeQuotaDesigns)){
   expect(choices.filter(choice=>choice===id)).toHaveLength(1);
   expect(parseStyle(id)).toMatchObject({family:design.family,design:{group:design.group,variant:design.variant}});
   expect(variantLabel(id)).toBe(design.label);expect(canonicalStyle(id)).toBe(id);expect(styleOptions(id)).toEqual([]);
  }
  for(const old of ['bars','bars:forecast','ruler','ruler:forecast','cells','segments','segments:rising:5','vessel','vessel:tank','vessel:hourglass','vessel:thermometer','numbers','rings','concentric','ticks','gauges','frame','sources','columns','signal','rowfill','texturebar:half:mixed:green']){
   expect(parseStyle(old),old).not.toBeNull();expect(parseStyle(old)?.design,old).toBeUndefined();
  }
  expect(readHomeStyles({getItem:()=>null}).style).toBe('bars');
  for(const bad of ['instrument:unknown','instrument:edge:extra','cycle:forecast','numbers:ticket:extra','cells:dots:10','vessel:chambers:10','ruler:cursor:forecast'])expect(parseStyle(bad)).toBeNull();
 });
 it.each(Object.keys(homeQuotaDesigns))('persists %s in uniform and per-account mode without replacing other choices',style=>{
  const original={...readHomeStyles({getItem:()=>null}),style};
  let p=homeStyleMode(original,'custom');p.accounts={'claude:one':style,'claude:two':'ticks'};
  p={...homeStyleMode(p,'uniform'),style:'cells'};
  p=readHomeStyles({getItem:key=>key===homeStyleKey?JSON.stringify(p):null});
  expect(homeStyleFor(p,'claude:one')).toBe('cells');
  p=homeStyleMode(p,'custom');expect(homeStyleFor(p,'claude:one')).toBe(style);expect(homeStyleFor(p,'claude:two')).toBe('ticks');expect(homeStyleFor(p,'claude:new')).toBe(style);
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

const now=Date.parse('2026-10-28T08:00:00Z');
const quota:Metric={id:'session',label:'Session',placement:'home',pinned:false,pinnable:true,hasData:true,notStarted:false,
 unit:'percent',percent:38,amount:null,periodSeconds:18000,resetsAt:new Date(now+10800000).toISOString(),values:[],chart:[],expiries:[]};
const reading={now,language:'en',missing:'No data'};
const render=(style:string,metrics:Metric[],remaining=false)=>renderToStaticMarkup(createElement(HomeMetrics,{style,metrics,remaining,...reading}));

describe('precise Home quota data contract',()=>{
 it.each([false,true])('uses already-converted readings once, remaining=%s',remaining=>{
  for(const used of [0,.4,37.6,79.6,80,100,112,-12]){
   const value=remaining?100-used:used,r=preciseQuotaReading({metric:{...quota,percent:value},remaining,...reading});
   expect(r.value).toBe(value);expect(r.used).toBeCloseTo(used,10);expect(r.valueText).toBe(`${Number(value.toFixed(8))}%`);
   expect(r.tone).toBe(used>=80?'critical':'normal');expect(Boolean(r.warning)).toBe(used>=80);
   expect(quotaMeter(r)['aria-valuenow']).toBe(Math.max(0,Math.min(100,value)));
  }
  expect(quotaReading({metric:{...quota,percent:79.6},remaining,...reading}).valueText).toBe('80%');
 });
 it('formats subtraction noise without losing fractional readings',()=>{
  expect(quotaPercent(100-99.6,'en')).toBe('0.4%');expect(quotaPercent(79.6,'en')).toBe('79.6%');
  expect(quotaPercent(112,'en')).toBe('112%');expect(quotaPercent(-12,'en')).toBe('-12%');
 });
 it.each([['cells:dots',100],['cells:grille',40],['vessel:chambers',10]] as const)('%s keeps partial cells and only clamps their graphics', (style,count)=>{
  for(const value of [0,.4,38,79.6,112,-12]){
   const html=render(style,[{...quota,percent:value}]);
   const pattern=style==='vessel:chambers'?/data-fraction="([^"]+)"/g:/transform:scaleX\(([^)]+)\)/g;
   const fractions=[...html.matchAll(pattern)].map(m=>Number(m[1]));
   expect(fractions).toHaveLength(count);
   expect(fractions.reduce((sum,n)=>sum+n,0)).toBeCloseTo(Math.max(0,Math.min(100,value))*count/100,8);
   expect(fractions.every(n=>n>=0&&n<=1)).toBe(true);
   if(value===.4)expect(fractions.some(n=>n>0&&n<1)).toBe(true);
  }
 });
 it('uses only valid observed time windows, independently of the display mode',()=>{
  expect(quotaCycle(quota,now).elapsed).toBe(40);
  expect(quotaCycle({...quota,percent:62},now)).toEqual(quotaCycle(quota,now));
  expect(quotaCycle({...quota,resetsAt:new Date(now+18000000).toISOString()},now).elapsed).toBe(0);
  for(const patch of [{hasData:false},{notStarted:true},{resetsAt:null},{resetsAt:'invalid'},
   {periodSeconds:null},{periodSeconds:0},{periodSeconds:-1},{resetsAt:new Date(now).toISOString()},
   {resetsAt:new Date(now-1).toISOString()},{resetsAt:new Date(now+18000001).toISOString()}])expect(quotaCycle({...quota,...patch},now).elapsed).toBeNull();
  expect(quotaCycle(quota,0).elapsed).toBeNull();
 });
 it.each(Object.keys(homeQuotaDesigns))('%s keeps exact quota values, interleaved balances, independent resets and expiries',style=>{
  const balance={...quota,id:'balance',label:'Balance',percent:null,periodSeconds:null,unit:'dollars',amount:7.25};
  const metrics=[{...quota,percent:.4,expiries:['2026-10-30T03:01:06Z']},balance,{...quota,id:'weekly',label:'Weekly',periodSeconds:604800,percent:79.6,resetsAt:new Date(now+360000000).toISOString()},
   {...quota,id:'overflow',label:'Overflow',percent:112},{...quota,id:'zero',label:'Zero',percent:0}];
  for(const remaining of [false,true]){
   const html=render(style,metrics.map(m=>({...m,percent:m.percent===null?null:remaining?100-m.percent:m.percent})),remaining);
   expect([...html.matchAll(/data-metric="([^"]+)"/g)].map(m=>m[1])).toEqual(metrics.map(m=>m.id));
   expect(html).toContain('$7.25');expect(html).toContain('expiries');expect(html).toContain('2026');
   expect(html.match(/role="meter"/g)).toHaveLength(4);
   const shown=[...html.matchAll(/data-quota-value="[^"]+">([^<]+)<small>%<\/small>/g)].map(m=>m[1]);
   expect(shown).toEqual(remaining?['99.6','20.4','-12','100']:['0.4','79.6','112','0']);
   expect(html).toContain('Quota exceeded');expect(html).not.toContain('Near quota limit');
   expect(html).toContain('5h');expect(html).toContain('1w');expect(html).not.toContain('Projected');
  }
 });
 it.each(Object.keys(homeQuotaDesigns))('%s never turns missing readings into zero, a numeric meter or a pointer',style=>{
  const html=render(style,[{...quota,hasData:false,percent:95},{...quota,id:'null',hasData:true,percent:null,resetsAt:null}]);
  expect(html).toContain('No data');expect(html).not.toContain('role="meter"');expect(html).not.toContain('data-needle-value');
  expect(html).not.toContain('data-rail-marker');expect(html).not.toContain('data-quota-fill');expect(html).not.toContain('data-time-fill');
  expect(html).not.toContain('data-tone="critical"');expect(html).not.toContain('data-quota-value="0"');
 });
 it('keeps the Used & Remaining track and its meter on raw Used in either mode',()=>{
  for(const remaining of [false,true]){
   const html=render('numbers:spread',[{...quota,percent:remaining?-12:112}],remaining);
   expect(html).toContain('aria-label="5h · Used"');expect(html).toContain('aria-valuenow="100"');
   expect(html).toContain('aria-valuetext="Used 112% · Remaining -12% · Quota exceeded"');expect(html).toContain('scaleX(1)');
  }
 });
});
