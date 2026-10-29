import {useState,type CSSProperties} from 'react';
import {WaffleChart} from '../components/arc/waffle-chart/waffle-chart';
import {Button} from '../components/arc/button/button';
import {SourceList,SectionTitle,NoValues,ReviewFoot} from './StatisticsShared';
import {statisticsCopy,valueOf,type StatisticsChartProps} from '../statisticsData';
import './statistics-composition.css';

function arc(radius:number,part:number) {
 const at=(degree:number)=>`${150+radius*Math.sin(degree*Math.PI/180)},${145-radius*Math.cos(degree*Math.PI/180)}`;
 return `M${at(-135)}A${radius} ${radius} 0 ${part>2/3?1:0} 1 ${at(-135+part*270)}`;
}
function Orbits({view,measure,selected,onSelect,language}:StatisticsChartProps) {
 const total=valueOf(view.total,measure)!,[page,setPage]=useState(0),{tr}=statisticsCopy(language);
 const pages=Math.ceil(view.sources.length/5),current=Math.min(page,pages-1),sources=view.sources.slice(current*5,current*5+5);
 return <><div className="tp-orbits"><svg viewBox="0 0 300 275" role="group" aria-label={tr('Each source track uses the same 0–100% scale.')}>
  {sources.map((source,index)=>{
   const radius=126-index*22,value=valueOf(source,measure),fraction=(value??0)/total;
   return <g key={source.key} role="button" tabIndex={0} aria-label={`${source.name} · ${value===null?tr('Unknown'):`${(fraction*100).toLocaleString(language,{maximumFractionDigits:1})}%`}`} aria-pressed={selected===source.key}
    data-dim={selected!==null&&selected!==source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(selected===source.key?null:source.key);}}}>
    <path className="tp-orbit-track" d={arc(radius,1)} strokeWidth={13} fill="none"/>
    {fraction>0&&<path d={arc(radius,fraction)} stroke={source.color} strokeWidth={13} fill="none"/>}
   </g>;
  })}
 </svg><div className="tp-orbit-center"><strong>{view.sources.length}</strong><span>{tr('Sources')}</span></div><div className="tp-orbit-ends"><span>0%</span><span>100%</span></div></div>
 {pages>1&&<div className="tp-orbit-pager"><Button size="sm" variant="ghost" disabled={current===0} onClick={()=>setPage(current-1)}>{tr('Previous Sources')}</Button><span>{current+1} / {pages}</span><Button size="sm" variant="ghost" disabled={current===pages-1} onClick={()=>setPage(current+1)}>{tr('Next Sources')}</Button></div>}
 <p className="tp-caption">{sources.map(source=>source.name).join(' · ')}</p></>;
}
function Waffle({view,measure,selected,language}:StatisticsChartProps) {
 const total=valueOf(view.total,measure)!,source=view.sources.find(item=>item.key===selected),{tr}=statisticsCopy(language);
 return <><div className="tp-waffle"><WaffleChart data={view.sources.map(item=>({key:item.key,value:valueOf(item,measure)??0,color:selected!==null&&selected!==item.key?`color-mix(in oklab, ${item.color} 22%, var(--surface))`:item.color}))} label={tr('100 cells represent the recorded total. Exact values are listed below.')}/></div>
 <div className="tp-waffle-readout"><span>{source?source.name:tr('100 Cells, About 1% Each')}</span><strong>{source?(valueOf(source,measure)===null?tr('Unknown'):`${(valueOf(source,measure)!/total*100).toLocaleString(language,{maximumFractionDigits:2})}%`):tr('Source Shares')}</strong></div></>;
}
function Steps({view,measure,selected,onSelect,language}:StatisticsChartProps) {
 const total=valueOf(view.total,measure)!,{tr,format}=statisticsCopy(language);let sum=0;
 const entries=view.sources.map(source=>{const from=sum,value=valueOf(source,measure);sum+=value??0;return {source,value,from,to:sum};});
 return <div className="tp-composition-waterfall" tabIndex={0} role="region" aria-label={tr('Additive Steps')}><div className="tp-step-grid" style={{'--steps':entries.length+1} as CSSProperties}>
  {entries.map(({source,value,from,to})=><button key={source.key} type="button" aria-pressed={selected===source.key} aria-label={`${source.name} · ${format(value,measure,false)}`} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}>
   <span className="tp-step-plot" aria-hidden="true"><span className="tp-step-number" style={{bottom:`${to/total*100}%`}}>{value===null?'?':format(value,measure)}</span>
    {value===null?<span className="tp-step-missing">?</span>:<i className={value===0?'tp-step-zero':''} style={{bottom:`${from/total*100}%`,height:`${value/total*100}%`}}/>}<span className="tp-step-connector" style={{bottom:`${to/total*100}%`}}/>
   </span><span className="tp-step-label">{source.name}</span>
  </button>)}<div className="tp-step-total"><span className="tp-step-plot" aria-hidden="true"><span className="tp-step-number" style={{bottom:'100%'}}>{format(total,measure)}</span><i style={{height:'100%'}}/></span><span className="tp-step-label">{tr('Total')}</span></div>
 </div></div>;
}
export function StatisticsComposition(props:StatisticsChartProps) {
 const {view,measure,variant,selected,onSelect,language}=props,total=valueOf(view.total,measure),{tr,format,metricLabel}=statisticsCopy(language);
 return <div className={`tp-composition tp-composition-${variant}`}>
  <p className="tp-inline-total"><span>{metricLabel(measure)}</span><strong>{format(total,measure)}</strong></p>
  {variant!==2&&total!==null&&total>0&&<div className="tp-composition-key" aria-label={tr('Source Shares')}>{view.sources.map(source=><button type="button" key={source.key} aria-pressed={selected===source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}><i aria-hidden="true"/>{source.name}</button>)}</div>}
  {total===null||total===0?<NoValues measure={measure} language={language} unknown={total===null}/>:variant===0?<Orbits {...props}/>:variant===1?<Waffle {...props}/>:<Steps {...props}/>}
  <ReviewFoot>{tr(variant===0?'Each track is 0–100%. Compare the values, not arc lengths across different radii.':variant===1?'Whole cells are rounded to total 100. Small sources remain in the exact list.':'Each step adds a recorded contribution. Scroll horizontally to see every source.')}{measure==='cost'&&!view.costComplete?` ${tr('Only known costs are divided into shares.')}`:''}</ReviewFoot>
  <SectionTitle>{tr('Source Details')}</SectionTitle><SourceList {...props} bars={false}/>
 </div>;
}
