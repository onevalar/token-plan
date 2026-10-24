import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {HomeMetrics} from '../../../HomeMetrics';
import type {Metric} from '../../../desktop';
import {textFor} from '../../../copy';

const base:Metric={id:'quota',label:'Session',placement:'home',pinned:false,pinnable:true,hasData:true,notStarted:false,
 unit:'percent',percent:37.6,amount:null,periodSeconds:18000,resetsAt:null,values:[],chart:[],expiries:[]};
const render=(metrics:Metric[],remaining=false)=>renderToStaticMarkup(<HomeMetrics metrics={metrics} style="ticks" now={0} language="en" missing="No data" remaining={remaining}/>);

describe('Tick Ring quota rendering',()=>{
 it.each([
  {remaining:false,value:0,shown:'0%',tone:'normal',warning:''},
  {remaining:false,value:79.6,shown:'80%',tone:'normal',warning:''},
  {remaining:false,value:80,shown:'80%',tone:'critical',warning:'Near quota limit'},
  {remaining:false,value:100,shown:'100%',tone:'critical',warning:'Quota exhausted'},
  {remaining:false,value:112,shown:'112%',tone:'critical',warning:'Quota exceeded'},
  {remaining:false,value:37.6,shown:'38%',tone:'normal',warning:''},
  {remaining:true,value:100,shown:'100%',tone:'normal',warning:''},
  {remaining:true,value:20.4,shown:'20%',tone:'normal',warning:''},
  {remaining:true,value:20,shown:'20%',tone:'critical',warning:'Near quota limit'},
  {remaining:true,value:0,shown:'0%',tone:'critical',warning:'Quota exhausted'},
  {remaining:true,value:-12,shown:'-12%',tone:'critical',warning:'Quota exceeded'},
  {remaining:true,value:62.4,shown:'62%',tone:'normal',warning:''},
 ])('preserves $value with remaining=$remaining, bounding only the mask and ARIA range',({remaining,value,shown,tone,warning})=>{
  const html=render([{...base,percent:value}],remaining),bounded=Math.max(0,Math.min(100,value));
  expect(html).toContain(`data-metric="quota" data-tone="${tone}"`);
  expect(html).toContain(`aria-label="5h · ${remaining?'Remaining':'Used'}"`);
  expect(html).toContain(`aria-valuenow="${bounded}"`);
  expect(html).toContain(`aria-valuetext="${[shown,warning].filter(Boolean).join(' · ')}"`);
  expect(html).toMatch(new RegExp(`<strong[^>]*>${shown}</strong>`));
  expect(html).toContain(`stroke-dasharray="${Math.max(0,Math.min(1,value/100))} 1"`);
  expect(html).not.toMatch(/tabindex=|<button|<animate\b/);
 });
 it.each([{hasData:false,percent:95},{hasData:true,percent:null},{hasData:false,percent:0}])('keeps missing readings distinct from zero: %j',reading=>{
  const html=render([{...base,...reading}]);
  expect(html).toContain('No data');expect(html).toContain('data-tone="normal"');
  expect(html).not.toContain('role="meter"');expect(html).not.toContain('<mask');expect(html).not.toContain('0%');
 });
 it.each([false,true])('keeps the actual not-started percentage with remaining=%s',remaining=>{
  const value=remaining?83:17,html=render([{...base,percent:value,notStarted:true}],remaining);
  expect(html).toContain(`aria-valuetext="${value}%"`);expect(html).toContain(textFor('en').notStarted);
 });
 it('keeps each quota independent with its own mask and meter',()=>{
  const html=render([{...base,percent:37},{...base,id:'weekly',label:'Weekly',periodSeconds:604800,percent:82}]);
  const ids=[...html.matchAll(/<mask id="([^"]+)"/g)].map(match=>match[1]);
  expect(ids).toHaveLength(2);expect(new Set(ids).size).toBe(2);
  for(const id of ids)expect(html).toContain(`mask="url(#${id})"`);
  expect(html.match(/role="meter"/g)).toHaveLength(2);
  expect(html).toContain('aria-valuetext="37%"');expect(html).toContain('aria-valuetext="82% · Near quota limit"');
  expect(html).toContain('stroke-dasharray="0.37 1"');expect(html).toContain('stroke-dasharray="0.82 1"');
 });
});
