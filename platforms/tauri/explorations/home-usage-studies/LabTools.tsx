import {useEffect,useState,type RefObject} from 'react';
import {Bookmark,Check,Copy,Download,RotateCcw} from 'lucide-react';
import {Button} from '../../src/components/arc/button/button';
import {Select} from '../../src/components/arc/select/select';
import {Switch} from '../../src/components/arc/switch/switch';
import {Slider} from './arc/slider/slider';
import SegmentedControl from './arc/segmented-control/segmented-control';
import {allStudies,families} from './catalog';
import {initialSimulation,percent,scenarios,type Scenario,type Simulation} from './data';

export type Parameters={space:number;number:number;radius:number};
export const initialParameters:Parameters={space:20,number:36,radius:16};
const storageKey='tokenplan-home-usage-studies-review-v1';
type Notes={shortlist:string[];notes:Record<string,string>};
function readNotes():Notes&{error:string} {
 try {
  const raw=localStorage.getItem(storageKey);
  if(!raw)return {shortlist:[],notes:{},error:''};
  const saved=JSON.parse(raw);
  if(!Array.isArray(saved.shortlist)||!saved.notes||typeof saved.notes!=='object')throw new Error('Unrecognized home exploration notes');
  return {shortlist:saved.shortlist.filter((id:unknown)=>typeof id==='string'&&allStudies.some(s=>s.id===id)),notes:Object.fromEntries(Object.entries(saved.notes).filter(([id,note])=>allStudies.some(s=>s.id===id)&&typeof note==='string')),error:''} as Notes&{error:string};
 } catch(error){console.warn('Could not read home exploration notes',error);return {shortlist:[],notes:{},error:'未能读取浏览器中的记录；当前选择仍可复制或下载。'};}
}

export function Glyph({family,variant}:{family:number;variant:number}) {
 return <svg viewBox="0 0 72 44" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
  {family===0?(variant===0?<>{[20,52].map(x=><g key={x}><path d={`M${x-12} 30a16 16 0 1 1 24 0`}/><path d={`M${x} 23l7-12`}/><path d={`M${x-5} 35h10`} opacity=".45"/></g>)}</>:variant===1?<><path d="M48 6a16 16 0 0 1 0 32M12 15h21M12 23h14M12 34h28"/><circle cx="62" cy="28" r="3" fill="currentColor"/></>:<><path d="M12 27a17 17 0 1 1 25 0M24 20l9-8M48 12h16M48 20h12M10 36h54"/><circle cx="12" cy="36" r="2" fill="currentColor"/></>):null}
  {family===1?(variant===0?<>{Array.from({length:35},(_,i)=><circle key={i} cx={8+i%7*9} cy={5+Math.floor(i/7)*8} r={2.5} fill="currentColor" stroke="none" opacity={i<17?1:.25}/>)}</>:variant===1?<>{Array.from({length:12},(_,i)=><path key={i} d={`M${8+i*5} 9l-4 25`} strokeWidth="3" opacity={i<8?1:.25}/>)}</>:<>{[14,40].map((x,j)=><g key={x}><rect x={x} y="7" width="18" height="31" rx="4"/><path d={`M${x+5} 3h8M${x+4} 32h10M${x+4} 26h10`}/>{j===1&&<path d={`M${x+4} 20h10M${x+4} 14h10`}/>}</g>)}</>):null}
  {family===2?(variant===0?<><rect x="6" y="5" width="60" height="34" rx="17"/><rect x="12" y="11" width="48" height="22" rx="11" strokeDasharray="3 3"/><path d="M36 5h13a17 17 0 0 1 17 17" strokeWidth="3"/></>:variant===1?<><path d="M8 10h56M8 20h40M8 29h56M8 39h24"/><path d="M48 5v20M32 25v18" strokeDasharray="2 2" opacity=".5"/></>:<><path d="M9 12h29M9 22h20M9 32h32"/><circle cx="55" cy="21" r="11"/><path d="M55 21V12M55 21l6 5"/></>):null}
  {family===3?(variant===0?<><path d="M6 15h60M6 34h60M6 9v12M66 9v12M6 28v12M66 28v12"/><path d="M28 8v14M53 27v14" strokeWidth="3"/></>:variant===1?<><path d="M14 5v34M10 5h8M10 39h8M30 13h30M30 22h23M30 33h29"/><path d="M8 19h12" strokeWidth="3"/></>:<><path d="M7 12h45a10 10 0 0 1 0 20H7"/><path d="M7 8v8M7 28v8M43 8v8M25 28v8"/><circle cx="28" cy="12" r="3" fill="currentColor"/></>):null}
  {family===4?(variant===0?<><rect x="6" y="6" width="60" height="32" rx="4"/><path d="M39 9v24" strokeDasharray="2 3"/><path d="M14 16h17M14 24h12M47 17h11M47 25h8M13 33h43"/></>:variant===1?<><path d="M8 15h20M8 24h15M45 15h19M45 24h15M38 10l-5 20M8 36h56"/><path d="M8 36h28" strokeWidth="4"/></>:<><path d="M6 12h17M6 29h17M30 12h18M30 29h18"/><circle cx="60" cy="12" r="7"/><circle cx="60" cy="30" r="7"/></>):null}
 </svg>;
}

export function Variants({family,variant,onChoose,baseline}:{family:number;variant:number;baseline:boolean;onChoose:(f:number,v:number)=>void}) {
 return <div className="hu-variants" aria-label="本方向的三种用量样式">{families[family].variants.map((s,v)=><button type="button" key={s.id} className="hu-choice" aria-pressed={!baseline&&variant===v} onClick={()=>onChoose(family,v)} data-testid={`choose-${s.id}`}>
  <Glyph family={family} variant={v}/><span><strong>{s.name}</strong><small>{s.focus}</small></span><span className="hu-choice-id">{s.id}</span>
 </button>)}</div>;
}

function Tuning({stage,parameters,disabled}:{stage:RefObject<HTMLDivElement|null>;parameters:RefObject<Parameters>;disabled:boolean}) {
 const [values,setValues]=useState(initialParameters);
 const change=(key:keyof Parameters,value:number)=>{
  parameters.current={...parameters.current,[key]:value};setValues(parameters.current);
  stage.current?.style.setProperty({'space':'--hu-space','number':'--hu-number-size','radius':'--hu-radius'}[key],`${value}px`);
 };
 return <details className="hu-tuning"><summary>微调字号、留白与圆角</summary><div>
  {disabled?<p>现有样式保持原样。返回探索方案后可调节。</p>:<>
   <Slider label="数字字号" value={values.number} min={28} max={44} step={2} format={v=>`${v}px`} onValueChange={v=>change('number',v)} animateValue={false}/>
   <Slider label="内容留白" value={values.space} min={12} max={28} step={4} format={v=>`${v}px`} onValueChange={v=>change('space',v)} animateValue={false}/>
   <Slider label="表面圆角" value={values.radius} min={0} max={28} step={2} format={v=>`${v}px`} onValueChange={v=>change('radius',v)} animateValue={false}/>
   <Button size="sm" variant="ghost" onClick={()=>{for(const key of Object.keys(initialParameters) as (keyof Parameters)[])change(key,initialParameters[key]);}}><RotateCcw size={14}/>恢复默认参数</Button>
  </>}
 </div></details>;
}

type ToolsProps={
 id:string;scenario:Scenario;onScenario:(value:Scenario)=>void;width:string;onWidth:(v:string)=>void;dark:boolean;onDark:(v:boolean)=>void;
 monochrome:boolean;onMonochrome:(v:boolean)=>void;simulation:Simulation;onSimulation:(s:Simulation)=>void;baseline:boolean;
 stage:RefObject<HTMLDivElement|null>;parameters:RefObject<Parameters>;context:()=>string;onChoose:(f:number,v:number)=>void;
};
export function LabTools({id,scenario,onScenario,width,onWidth,dark,onDark,monochrome,onMonochrome,simulation,onSimulation,baseline,stage,parameters,context,onChoose}:ToolsProps) {
 const [saved,setSaved]=useState(readNotes),[notice,setNotice]=useState(''),[fallback,setFallback]=useState('');
 const shortlisted=saved.shortlist.includes(id),canSimulate=scenario==='normal'||scenario==='single';
 useEffect(()=>{
  try{localStorage.setItem(storageKey,JSON.stringify({shortlist:saved.shortlist,notes:saved.notes}));}
  catch(error){console.warn('Could not save home exploration notes',error);setNotice('浏览器无法保存；请先复制或下载候选记录。');}
 },[saved.shortlist,saved.notes]);
 const report=()=>[
  'TokenPlan 主页用量 · 设计探索记录（未确认、未接入产品）',`当前方案：${id} ${allStudies.find(s=>s.id===id)?.name??''}`,context(),
  `字号 ${parameters.current.number}px；留白 ${parameters.current.space}px；圆角 ${parameters.current.radius}px`,
  canSimulate?`Claude 示例：Session 已用 ${simulation.session}%；Weekly 已用 ${simulation.weekly}%；周期进度 ${simulation.elapsed===null?'原始示例':`${simulation.elapsed}%`}`:'固定检验场景，未使用数据滑块中的调节值。',
  `候选：${saved.shortlist.length?saved.shortlist.map(id=>`${id} ${allStudies.find(s=>s.id===id)?.name}`).join('、'):'尚未收藏'}`,
  ...Object.entries(saved.notes).filter(([,note])=>note.trim()).map(([id,note])=>`${id}：${note}`),
  '本轮只比较主页额度样式；上一轮总量统计方案保持不变。所有账号与数据均为虚构示例。',
 ].join('\n');
 return <aside className="hu-tools" aria-label="比较条件与候选记录">
  <section className="hu-controls"><h2>比较条件</h2>
   <Select label="检验场景" value={scenario} options={[...scenarios]} onValueChange={v=>onScenario(v as Scenario)}/>
   <div className="hu-control-field"><span>面板宽度</span><SegmentedControl label="面板宽度" value={width} options={['390','460','560'].map(v=>({value:v,label:`${v}px`}))} onValueChange={onWidth}/></div>
   <Switch label="深色外观" checked={dark} onCheckedChange={onDark}/>
   <Switch label="单色读数" checked={monochrome} onCheckedChange={onMonochrome} disabled={baseline}/>
   <Tuning stage={stage} parameters={parameters} disabled={baseline}/>
  </section>
  <details className="hu-simulator" open><summary>动手调一调数据</summary><div>
   <p>{canSimulate?'仅修改第一个 Claude 示例账号；其他账号不动。':'固定边界场景不可编辑；切回日常或单账号即可调节。'}</p>
   <Slider label="Session 已用" value={simulation.session} min={0} max={120} step={.1} marks={[0,80,100,120]} format={percent} onValueChange={v=>onSimulation({...simulation,session:v})} disabled={!canSimulate} animateValue={false}/>
   <Slider label="Weekly 已用" value={simulation.weekly} min={0} max={120} step={.1} marks={[0,80,100,120]} format={percent} onValueChange={v=>onSimulation({...simulation,weekly:v})} disabled={!canSimulate} animateValue={false}/>
   <Slider label="周期已过" value={simulation.elapsed??40} min={0} max={100} step={1} format={percent} onValueChange={v=>onSimulation({...simulation,elapsed:v})} disabled={!canSimulate} animateValue={false}/>
   <p className="hu-simulation-note">{simulation.elapsed===null?'时间尚未覆盖：Session 已过 40%，Weekly 约 40.5%；动手调节后，两项使用同一时间比例。':'时间比例只改变重置时刻，不预测消耗；100% 显示到期待刷新。'}</p>
   <Button variant="ghost" size="sm" onClick={()=>{onSimulation(initialSimulation);if(!canSimulate)onScenario('normal');}}><RotateCcw size={14}/>恢复示例数据</Button>
  </div></details>
  <section className="hu-decision"><h2>留住你的偏好</h2><p>收藏不是最终确认，可以跨方向组合。</p>
   <Button variant="secondary" className="hu-shortlist-action" aria-pressed={shortlisted} disabled={baseline} onClick={()=>setSaved(s=>({...s,shortlist:shortlisted?s.shortlist.filter(v=>v!==id):[...s.shortlist,id]}))}>{shortlisted?<Check size={15}/>:<Bookmark size={15}/>} {baseline?'返回方案后收藏':shortlisted?`已加入候选 · ${id}`:`加入候选 · ${id}`}</Button>
   <label className="hu-note"><span>{id} 的想法</span><textarea value={saved.notes[id]??''} readOnly={baseline} maxLength={2000} placeholder="例如：喜欢 A2 的刻盘，搭配 E1 的重置区…" onChange={e=>setSaved(s=>({...s,notes:{...s.notes,[id]:e.target.value}}))}/></label>
   <div className="hu-shortlist" aria-label="已收藏的用量样式">{saved.shortlist.length?saved.shortlist.map(id=>{
    const index=allStudies.findIndex(s=>s.id===id);return <button type="button" key={id} onClick={()=>onChoose(Math.floor(index/3),index%3)}>{id} {allStudies[index].name}</button>;
   }):<span>还没有候选。记录仅保存在此浏览器。</span>}</div>
   <div className="hu-export"><Button size="sm" variant="ghost" onClick={async()=>{
    const value=report();try{await navigator.clipboard.writeText(value);setNotice('已复制，可粘贴回对话继续设计。');setFallback('');}
    catch{setFallback(value);setNotice('浏览器未允许复制；可手动复制下方文本或下载。');}
   }}><Copy size={14}/>复制选择</Button><Button size="sm" variant="ghost" onClick={()=>{
    const url=URL.createObjectURL(new Blob([report()],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download='tokenplan-home-usage-studies.txt';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('已生成选择记录并发起下载。');
   }}><Download size={14}/>下载</Button></div>
   <p className="hu-notice" role="status">{notice||saved.error}</p>
   {fallback&&<textarea className="hu-copy-fallback" readOnly value={fallback} aria-label="可手动复制的选择记录" onFocus={e=>e.currentTarget.select()}/>}
  </section>
 </aside>;
}

export function Catalog({onChoose}:{onChoose:(f:number,v:number)=>void}) {
 return <details className="hu-catalog"><summary>展开全部 15 个方案 <span>每个方向三种不同结构</span></summary><div>{families.map((family,f)=><section key={family.name}>
  <h3>{family.name}</h3>{family.variants.map((study,v)=><button type="button" key={study.id} onClick={()=>{onChoose(f,v);document.querySelector('.hu-workbench')?.scrollIntoView({block:'start'});}}><Glyph family={f} variant={v}/><span>{study.id} · {study.name}<small>{study.focus}</small></span></button>)}
 </section>)}</div></details>;
}
