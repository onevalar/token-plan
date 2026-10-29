import type {CSSProperties} from 'react';
import {WaffleChart} from '../../src/components/arc/waffle-chart/waffle-chart';
import {Hero,SourceList,SectionTitle,NoValues,ReviewFoot} from './Shared';
import {format,valueOf,type StudyProps} from './data';
import './composition-studies.css';

function arc(radius:number,part:number) {
 const at=(degree:number)=>`${150+radius*Math.sin(degree*Math.PI/180)},${145-radius*Math.cos(degree*Math.PI/180)}`;
 return `M${at(-135)}A${radius} ${radius} 0 ${part>2/3?1:0} 1 ${at(-135+part*270)}`;
}
function Orbits({view,measure,selected,onSelect}:StudyProps) {
 const total=valueOf(view.total,measure)!;
 return <div className="tp-orbits">
  <svg viewBox="0 0 300 275" role="group" aria-label="同一总量下的来源占比，每条轨道的满刻度都是 100%">
   {view.sources.map((source,i)=>{
    const radius=126-i*22,value=valueOf(source,measure),fraction=(value??0)/total;
    return <g key={source.key} role="button" tabIndex={0} aria-label={`${source.name}，${value===null?'费用未知':`${(fraction*100).toFixed(1)}%`}`} aria-pressed={selected===source.key}
     data-dim={selected!==null&&selected!==source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(selected===source.key?null:source.key);}}}>
     <path className="tp-orbit-track" d={arc(radius,1)} strokeWidth={13} fill="none"/>
     {fraction>0&&<path d={arc(radius,fraction)} stroke={source.color} strokeWidth={13} fill="none"/>}
    </g>;
   })}
  </svg>
  <div className="tp-orbit-center"><strong>{view.sources.length}</strong><span>个来源</span></div>
  <div className="tp-orbit-ends"><span>0%</span><span>100%</span></div>
 </div>;
}
function Waffle({view,measure,selected}:StudyProps) {
 const total=valueOf(view.total,measure)!,source=view.sources.find(s=>s.key===selected);
 return <>
  <div className="tp-waffle">
   <WaffleChart data={view.sources.map(source=>({key:source.key,value:valueOf(source,measure)??0,color:selected!==null&&selected!==source.key?`color-mix(in oklab, ${source.color} 22%, var(--surface))`:source.color}))} label="一百格表示当前已知总量；可用下方来源列表选择并查看精确数值"/>
  </div>
  <div className="tp-waffle-readout"><span>{source?source.name:'100 格 · 每格约 1%'}</span><strong>{source?(valueOf(source,measure)===null?'费用未知':`${(valueOf(source,measure)!/total*100).toFixed(2)}%`):'同一总量，不同来源'}</strong></div>
 </>;
}
function Steps({view,measure,selected,onSelect}:StudyProps) {
 const total=valueOf(view.total,measure)!;
 let sum=0;
 const entries=view.sources.map(source=>{const from=sum,value=valueOf(source,measure);sum+=value??0;return {source,value,from,to:sum};});
 return <div className="tp-composition-waterfall">
  <div className="tp-step-grid" style={{'--steps':entries.length+1} as CSSProperties}>
   {entries.map(({source,value,from,to})=><button key={source.key} type="button" aria-pressed={selected===source.key} aria-label={`${source.name}，贡献${format(value,measure,false)}`} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}>
    <span className="tp-step-plot" aria-hidden="true">
     <span className="tp-step-number" style={{bottom:`${to/total*100}%`}}>{value===null?'?':format(value,measure)}</span>
     {value===null?<span className="tp-step-missing">?</span>:<i className={value===0?'tp-step-zero':''} style={{bottom:`${from/total*100}%`,height:`${value/total*100}%`}}/>}
     <span className="tp-step-connector" style={{bottom:`${to/total*100}%`}}/>
    </span><span className="tp-step-label">{source.key==='antigravity'?'AG':source.name}</span>
   </button>)}
   <div className="tp-step-total"><span className="tp-step-plot" aria-hidden="true"><span className="tp-step-number" style={{bottom:'100%'}}>{format(total,measure)}</span><i style={{height:'100%'}}/></span><span className="tp-step-label">合计</span></div>
  </div>
 </div>;
}
export function CompositionStudies(props:StudyProps) {
 const {view,measure,variant,selected,onSelect}=props,total=valueOf(view.total,measure);
 return <div className={`tp-composition tp-composition-${variant}`}>
  <Hero view={view} measure={measure} small/>
  {variant!==2&&total!==null&&total>0&&<div className="tp-composition-key" aria-label="图表来源图例">{view.sources.map(source=><button type="button" key={source.key} aria-pressed={selected===source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}><i aria-hidden="true"/>{source.name}</button>)}</div>}
  {total===null||total===0?<NoValues measure={measure} unknown={total===null}/>:variant===0?<Orbits {...props}/>:variant===1?<Waffle {...props}/>:<Steps {...props}/>}
  <ReviewFoot>{variant===0?'每圈同为 0–100%；请比较读数，不直接比较不同半径的弧长。':variant===1?'整格使用舍入分配，合计始终为 100 格；小于 1% 的来源也保留在明细里。':'每一步是该来源的已知贡献，最后一列是它们的和。AG 为 Antigravity。'}{measure==='cost'&&!view.costComplete?' 这里只分配已知费用，未知部分不补零。':''}</ReviewFoot>
  <SectionTitle aside="精确占比与读数">来源明细</SectionTitle>
  <SourceList view={view} measure={measure} selected={selected} onSelect={onSelect} bars={false}/>
 </div>;
}
