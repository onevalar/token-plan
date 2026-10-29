import {useEffect,useId,useState,type RefObject} from 'react';
import {Bookmark,Check,Copy,Download,RotateCcw} from 'lucide-react';
import {Button} from '../../src/components/arc/button/button';
import {Select} from '../../src/components/arc/select/select';
import {Switch} from '../../src/components/arc/switch/switch';
import {allStudies,families} from './catalog';
import {scenarios} from './data';

const storageKey='tokenplan-total-studies-review-v1';
type Notes={shortlist:string[];notes:Record<string,string>};
function readNotes():Notes&{error:string} {
 try {
  const raw=localStorage.getItem(storageKey);
  if(!raw)return {shortlist:[],notes:{},error:''};
  const saved=JSON.parse(raw);
  if(!Array.isArray(saved.shortlist)||!saved.notes||typeof saved.notes!=='object')throw new Error('Unrecognized exploration notes');
  return {shortlist:saved.shortlist.filter((id:unknown)=>typeof id==='string'&&allStudies.some(s=>s.id===id)),notes:Object.fromEntries(Object.entries(saved.notes).filter(([id,note])=>allStudies.some(s=>s.id===id)&&typeof note==='string')),error:''} as Notes&{error:string};
 } catch(error){console.warn('Could not read exploration notes',error);return {shortlist:[],notes:{},error:'未能读取浏览器中的候选记录；当前选择仍可复制或下载。'};}
}
export function StudyGlyph({family,variant}:{family:number;variant:number}) {
 const common={stroke:'currentColor',strokeWidth:1.8,fill:'none'};
 return <svg viewBox="0 0 72 40" aria-hidden="true" {...common}>
  {family===0?(variant===0?<><path d="M12 31 A24 24 0 0 1 60 31" strokeWidth={5}/><path d="M26 28h20M30 34h12" opacity=".45"/></>:variant===1?<><path d="M10 10h36M10 17h24M10 29h52M10 35h52"/><path d="M54 8v10M60 8v10" opacity=".35"/></>:<>{[15,36,57].map(x=><circle key={x} cx={x} cy={19} r={8}/>)}<path d="M9 33h12M30 33h12M51 33h12" opacity=".5"/></>):null}
  {family===1?(variant===0?<>{[16,11,6].map(r=><path key={r} d={`M${36-r} 30 A${r} ${r} 0 1 1 ${36+r} 30`}/>)}</>:variant===1?<>{Array.from({length:28},(_,i)=><rect key={i} x={10+i%7*8} y={6+Math.floor(i/7)*8} width={5} height={5} fill="currentColor" stroke="none" opacity={i<15?1:.3}/>)}</>:<><path d="M10 30V20h10V14h12V8h12V4h12"/><path d="M59 4v29M8 34h56" opacity=".35"/></>):null}
  {family===2?(variant===0?<>{Array.from({length:21},(_,i)=><rect key={i} x={10+i%7*8} y={8+Math.floor(i/7)*9} width={5} height={6} fill="currentColor" stroke="none" opacity={.2+(i*7%5)/5}/>)}</>:variant===1?<>{[16,26,12,32,22,14,28].map((h,i)=><path key={i} d={`M${12+i*8} 35v-${h}`} strokeWidth={5} strokeDasharray="3 2"/>)}</>:<><path d="M8 32L16 30 24 25 32 24 40 15 48 14 56 9 64 6"/><path d="M8 35L18 32 28 32 38 28 48 23 64 22" strokeDasharray="3 3" opacity=".4"/></>):null}
  {family===3?(variant===0?<>{[10,20,30].map((y,i)=><g key={y}><path d={`M${14+i*5} ${y}h${24-i*6}`}/><circle cx={14+i*5} cy={y} r={3}/><circle cx={38-i} cy={y} r={3} fill="currentColor"/></g>)}</>:variant===1?<><path d="M10 13l7-3 7 4 7-9M41 14l6-6 7 3 8-7M10 32l7-9 7 5 7-7M41 32l7-3 7 5 7-8"/></>:<><path d="M8 35V17h9V10h10v6h10V5h10v8h10v22"/><path d="M8 35h54" opacity=".4"/></>):null}
  {family===4?(variant===0?<><path d="M13 31 A25 25 0 1 1 59 31"/><path d="M36 26l12-15"/><circle cx={36} cy={26} r={3} fill="currentColor"/></>:variant===1?<><rect x={9} y={9} width={51} height={23} rx={5}/><path d="M64 16v10M16 14v13M23 14v13M30 14v13M37 14v13" strokeWidth={3}/></>:<><path d="M8 16h56M36 6v27M12 16v8M20 16v6M28 16v8M44 16v8M52 16v6M60 16v8"/><circle cx={36} cy={8} r={2} fill="currentColor"/></>):null}
 </svg>;
}
export function Variants({family,variant,onChange,baseline}:{family:number;variant:number;onChange:(f:number,v:number)=>void;baseline:boolean}) {
 return <div className="ts-variants" aria-label="本路线的三种结构">{families[family].variants.map((study,i)=><button key={study.id} type="button" className="ts-choice" aria-pressed={!baseline&&variant===i} onClick={()=>onChange(family,i)} data-testid={`choose-${study.id}`}>
  <StudyGlyph family={family} variant={i}/><span><strong>{study.name}</strong><small>{study.focus}</small></span><span className="ts-choice-id">{study.id}</span>
 </button>)}</div>;
}
export function Tuning({stage,values}:{stage:RefObject<HTMLElement|null>;values:RefObject<{padding:number;radius:number}>}) {
 const id=useId();
 const [padding,setPadding]=useState(24),[radius,setRadius]=useState(22);
 function change(key:'padding'|'radius',value:number) {
  values.current[key]=value;stage.current?.style.setProperty(key==='padding'?'--study-space':'--study-radius',`${value}px`);
  if(key==='padding')setPadding(value);else setRadius(value);
 }
 return <details className="ts-tuning"><summary>微调留白与圆角</summary><div>
  <label htmlFor={`${id}-padding`}><span>内部留白 <output>{padding}px</output></span><input id={`${id}-padding`} type="range" min={12} max={36} step={2} value={padding} onChange={e=>change('padding',Number(e.target.value))}/></label>
  <label htmlFor={`${id}-radius`}><span>外框圆角 <output>{radius}px</output></span><input id={`${id}-radius`} type="range" min={0} max={36} step={2} value={radius} onChange={e=>change('radius',Number(e.target.value))}/></label>
  <Button size="sm" variant="ghost" onClick={()=>{change('padding',24);change('radius',22);}}><RotateCcw size={13}/>恢复默认</Button>
 </div></details>;
}
type ToolsProps={
 id:string;scenario:string;onScenario:(v:string)=>void;width:string;onWidth:(v:string)=>void;dark:boolean;onDark:(v:boolean)=>void;
 stage:RefObject<HTMLElement|null>;parameters:RefObject<{padding:number;radius:number}>;context:()=>string;onChoose:(f:number,v:number)=>void;
};
export function LabTools({id,scenario,onScenario,width,onWidth,dark,onDark,stage,parameters,context,onChoose}:ToolsProps) {
 const [saved,setSaved]=useState(readNotes),[notice,setNotice]=useState(''),[fallback,setFallback]=useState('');
 const shortlisted=saved.shortlist.includes(id);
 useEffect(()=>{
  try {localStorage.setItem(storageKey,JSON.stringify({shortlist:saved.shortlist,notes:saved.notes}));}
  catch(error){console.warn('Could not save exploration notes',error);setNotice('浏览器无法保存；请先复制或下载候选记录。');}
 },[saved.shortlist,saved.notes]);
 const report=()=>[
  'TokenPlan 总量统计 · 设计探索记录（尚未选定正式方案）',
  `当前体验：${id} ${allStudies.find(s=>s.id===id)?.name??''}`,context(),
  `留白 ${parameters.current.padding}px；圆角 ${parameters.current.radius}px`,
  `候选：${saved.shortlist.length?saved.shortlist.map(id=>`${id} ${allStudies.find(s=>s.id===id)?.name}`).join('、'):'尚未收藏'}`,
  ...Object.entries(saved.notes).filter(([,note])=>note.trim()).map(([id,note])=>`${id}：${note}`),
  '所有数值为虚构示例；预算只是一条个人参考线。当前应用未改变。',
 ].join('\n');
 const toggle=()=>setSaved(previous=>({...previous,shortlist:shortlisted?previous.shortlist.filter(value=>value!==id):[...previous.shortlist,id]}));
 return <aside className="ts-tools" aria-label="比较条件和候选记录">
  <section className="ts-controls"><h2>试一试边界</h2><p>保持同一份数据，再换一种读法。</p>
   <Select label="检验场景" value={scenario} options={scenarios} onValueChange={onScenario}/>
   <Select label="面板宽度" value={width} options={[{value:'390',label:'390px · 紧凑面板'},{value:'560',label:'560px · 舒展面板'},{value:'760',label:'760px · 宽屏探索'}]} onValueChange={onWidth}/>
   <Switch label="深色外观" checked={dark} onCheckedChange={onDark}/>
   <Tuning stage={stage} values={parameters}/>
  </section>
  <section className="ts-decision"><h2>留住你的偏好</h2><p>收藏不是最终确认，可随时取消。</p>
   <Button variant="secondary" aria-pressed={shortlisted} onClick={toggle} className="ts-shortlist-action">{shortlisted?<Check size={15}/>:<Bookmark size={15}/>} {shortlisted?`已加入候选 · ${id}`:`加入候选 · ${id}`}</Button>
   <label className="ts-note"><span>{id} 的想法</span><textarea value={saved.notes[id]??''} maxLength={2000} placeholder="例如：喜欢弧面，但想换成按天的柱图…" onChange={event=>setSaved(previous=>({...previous,notes:{...previous.notes,[id]:event.target.value}}))}/></label>
   <div className="ts-shortlist" aria-label="已收藏候选">{saved.shortlist.length?saved.shortlist.map(id=>{
    const study=allStudies.find(s=>s.id===id)!;
    return <button type="button" key={id} onClick={()=>onChoose(study.f,study.v)}>{id} {study.name}</button>;
   }):<span>尚未收藏。可以跨路线混搭。</span>}</div>
   <div className="ts-export"><Button variant="ghost" size="sm" onClick={async()=>{
    const text=report();try{await navigator.clipboard.writeText(text);setNotice('已复制候选与参数，可粘贴回对话。');setFallback('');}
    catch{setFallback(text);setNotice('浏览器未允许复制；请从下方文本手动复制，或下载。');}
   }}><Copy size={13}/>复制选择</Button><Button variant="ghost" size="sm" onClick={()=>{
    const url=URL.createObjectURL(new Blob([report()],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='tokenplan-total-studies.txt';a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('已生成选择记录并发起下载。');
   }}><Download size={13}/>下载</Button></div>
   <p className="ts-storage-note">仅保存在此浏览器，不写入应用。</p>
   <p className="ts-tool-notice" role="status">{notice||saved.error}</p>
   {fallback&&<textarea aria-label="可手动复制的选择记录" readOnly value={fallback} className="ts-copy-fallback" onFocus={event=>event.currentTarget.select()}/>}
  </section>
 </aside>;
}
export function Catalog({onChoose}:{onChoose:(f:number,v:number)=>void}) {
 return <details className="ts-catalog"><summary>展开 15 个方案索引 <span>按想解决的问题挑选</span></summary><div>{families.map((family,f)=><section key={family.name}>
  <h3>{family.name}</h3>{family.variants.map((study,v)=><button key={study.id} type="button" onClick={()=>{onChoose(f,v);document.querySelector('.ts-workbench')?.scrollIntoView({block:'start'});}}><span>{study.id} · {study.name}</span><small>{study.focus}</small></button>)}
 </section>)}</div></details>;
}
