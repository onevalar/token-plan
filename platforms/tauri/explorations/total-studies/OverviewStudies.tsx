import {useState,type CSSProperties} from 'react';
import {Gauge} from '../../src/components/arc/gauge/gauge';
import {Hero,StatStrip,SourceList,ProviderMark,Sparkline,SectionTitle,NoValues,ReviewFoot} from './Shared';
import {format,valueOf,metricLabel,type StudyProps} from './data';
import './overview-studies.css';

const semicircle=(from:number,to:number)=>{
 const at=(part:number)=>`${160+136*Math.cos(Math.PI+part*Math.PI)},${158+136*Math.sin(Math.PI+part*Math.PI)}`;
 return `M${at(from)}A136 136 0 0 1 ${at(to)}`;
};
function ArcSummary({view,measure,selected,onSelect}:StudyProps) {
 const total=valueOf(view.total,measure);
 let used=0;
 return <>
  {total!==null&&total>0?<div className="tp-semi">
   <svg viewBox="0 0 320 190" role="group" aria-label="来源占比半圆，可点选来源">
    {view.sources.map(source=>{
     const value=valueOf(source,measure)??0,start=used/total;used+=value;
     if(!value)return null;
     return <path key={source.key} d={semicircle(start,used/total)} pathLength={1} fill="none" stroke={source.color} strokeWidth={26} role="button" tabIndex={0}
      aria-label={`${source.name}，${(value/total*100).toFixed(1)}%，查看模型`} aria-pressed={selected===source.key} data-dim={selected!==null&&selected!==source.key}
      onClick={()=>onSelect(selected===source.key?null:source.key)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();onSelect(selected===source.key?null:source.key);}}}/>;
    })}
   </svg>
   <div className="tp-semi-center"><Hero view={view} measure={measure}/></div>
  </div>:<><Hero view={view} measure={measure}/><NoValues measure={measure} unknown={total===null}/></>}
  <StatStrip view={view}/>
  <SectionTitle aside="点击查看模型">来源分布</SectionTitle>
  <SourceList view={view} measure={measure} selected={selected} onSelect={onSelect}/>
 </>;
}
function Editorial({view,measure,selected,onSelect}:StudyProps) {
 const total=valueOf(view.total,measure);
 return <div className="tp-editorial">
  <p className="tp-editorial-intro">这 {view.length} 天，<br/>用量留下了这些记录。</p>
  <Hero view={view} measure={measure}/>
  <div className="tp-editorial-rule" aria-hidden="true">{total!==null&&total>0&&view.sources.map(source=><i key={source.key} style={{flex:(valueOf(source,measure)??0)/total,background:source.color}}/>)}</div>
  <div className="tp-editorial-meta"><span>{view.sourceCount} 个记录来源</span><span>{view.covered}/{view.length} 天有记录</span></div>
  <SectionTitle aside={measure==='tokens'?'Tokens':'USD · 已知部分'}>按来源展开</SectionTitle>
  <div className="tp-editorial-list">{view.sources.map(source=><button type="button" key={source.key} aria-pressed={selected===source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}>
   <ProviderMark source={source}/><span>{source.name}<small>{source.models.length} 个模型</small></span>
   <span className="tp-editorial-spark"><Sparkline values={source.days.map(d=>valueOf(d,measure))} color={source.color} height={30}/></span>
   <strong>{format(valueOf(source,measure),measure)}</strong>
  </button>)}</div>
  <ReviewFoot>小折线仅显示各来源的自身节奏，不共用纵轴；精确比较请看右侧数字。</ReviewFoot>
 </div>;
}
function Instruments({view,measure,selected,onSelect}:StudyProps) {
 const [explanation,setExplanation]=useState(0);
 const total=valueOf(view.total,measure),largest=[...view.sources].sort((a,b)=>(valueOf(b,measure)??0)-(valueOf(a,measure)??0))[0];
 const ratios=[
  {name:'主要来源',value:total?(valueOf(largest,measure)??0)/total*100:0,readout:total?largest.name:'占比不适用',detail:total?`${largest.name} 占${metricLabel(measure)}的 ${((valueOf(largest,measure)??0)/total*100).toFixed(1)}%。这是组成，不是套餐使用率。`:'总量为零或未知，无法计算来源占比。'},
  {name:'日期覆盖',value:view.covered/view.length*100,readout:`${view.covered} / ${view.length} 天`,detail:`选定的 ${view.length} 天里，有 ${view.covered} 天包含本地记录；缺少记录不能推断为零用量。`},
  {name:'费用已知',value:view.total.records?view.total.knownCosts/view.total.records*100:0,readout:`${view.total.knownCosts} / ${view.total.records} 条`,detail:`${view.total.records} 条记录中 ${view.total.knownCosts} 条有费用。即使所有费用已知，也只代表本地记录，不代表完整账单。`},
 ];
 return <><Hero view={view} measure={measure}/><div className="tp-instruments">{ratios.map((ratio,i)=><button key={ratio.name} type="button" aria-pressed={explanation===i} onClick={()=>setExplanation(i)}>
  {i===0&&!total?<div className="tp-mini-unavailable">不适用</div>:<Gauge value={ratio.value} label={ratio.name} valueText={`${ratio.name} ${Math.round(ratio.value)}%`}/>}<span>{ratio.name}</span><small>{ratio.readout}</small>
 </button>)}</div><p className="tp-instrument-readout">{ratios[explanation].detail}</p>
 <SectionTitle aside="各来源仍可展开">同一总量，逐项核对</SectionTitle><SourceList view={view} measure={measure} selected={selected} onSelect={onSelect} bars={false}/></>;
}
export function OverviewStudies(props:StudyProps) {
 return <div className={`tp-overview tp-overview-${props.variant}`}>{props.variant===0?<ArcSummary {...props}/>:props.variant===1?<Editorial {...props}/>:<Instruments {...props}/>}</div>;
}
