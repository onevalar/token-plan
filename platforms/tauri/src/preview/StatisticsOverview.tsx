import {useState,type CSSProperties} from 'react';
import {Gauge} from '../components/arc/gauge/gauge';
import {Hero,ComparisonNote,StatStrip,SourceList,ProviderMark,Sparkline,SectionTitle,NoValues,ReviewFoot} from './StatisticsShared';
import {statisticsCopy,valueOf,type StatisticsChartProps} from '../statisticsData';
import './statistics-overview.css';

const semicircle=(from:number,to:number)=>{
 const at=(part:number)=>`${160+136*Math.cos(Math.PI+part*Math.PI)},${158+136*Math.sin(Math.PI+part*Math.PI)}`;
 return `M${at(from)}A136 136 0 0 1 ${at(to)}`;
};
function ArcSummary(props:StatisticsChartProps) {
 const {view,measure,selected,onSelect,language}=props,{tr}=statisticsCopy(language),total=valueOf(view.total,measure);
 let used=0;
 return <>
  {total!==null&&total>0?<div className="tp-semi"><svg viewBox="0 0 320 190" role="group" aria-label={tr('Source Shares')}>
   {view.sources.map(source=>{
    const value=valueOf(source,measure)??0,start=used/total;used+=value;
    if(!value)return null;
    return <path key={source.key} d={semicircle(start,used/total)} fill="none" stroke={source.color} strokeWidth={26} role="button" tabIndex={0}
     aria-label={`${source.name} · ${(value/total*100).toLocaleString(language,{maximumFractionDigits:1})}%`} aria-pressed={selected===source.key} data-dim={selected!==null&&selected!==source.key}
     onClick={()=>onSelect(selected===source.key?null:source.key)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(selected===source.key?null:source.key);}}}/>;
   })}</svg><div className="tp-semi-center"><Hero {...props} small comparison={false}/></div></div>:<><Hero {...props} comparison={false}/><NoValues measure={measure} language={language} unknown={total===null}/></>}
  <ComparisonNote {...props}/>
  <StatStrip view={view} language={language}/><SectionTitle>{tr('Source Details')}</SectionTitle><SourceList {...props}/>
 </>;
}
function Editorial(props:StatisticsChartProps) {
 const {view,measure,selected,onSelect,language}=props,{tr,format}=statisticsCopy(language),total=valueOf(view.total,measure);
 return <div className="tp-editorial">
  <p className="tp-editorial-intro">{tr('Your Recorded Usage Over %@ Days',view.length)}</p><Hero {...props}/>
  <div className="tp-editorial-rule" aria-hidden="true">{total!==null&&total>0&&view.sources.map(source=><i key={source.key} style={{flex:(valueOf(source,measure)??0)/total,background:source.color}}/>)}</div>
  <div className="tp-editorial-meta"><span>{tr('%@ Recorded Sources',view.sourceCount)}</span><span>{tr('%@ / %@ Days',view.covered,view.length)}</span></div>
  <SectionTitle>{tr('Source Details')}</SectionTitle>
  <div className="tp-editorial-list">{view.sources.map(source=><button type="button" key={source.key} aria-pressed={selected===source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}>
   <ProviderMark source={source}/><span>{source.name}<small>{tr('%@ Models',source.models.length)}</small></span>
   <span className="tp-editorial-spark"><Sparkline values={source.days.map(day=>valueOf(day,measure))} color={source.color} height={30}/></span>
   <strong>{format(valueOf(source,measure),measure)}</strong>
  </button>)}</div>
  <ReviewFoot>{tr('Small trends use separate scales. Compare the exact values, not their heights.')}</ReviewFoot>
 </div>;
}
function Instruments(props:StatisticsChartProps) {
 const {view,measure,language}=props,{tr,metricLabel}=statisticsCopy(language),[explanation,setExplanation]=useState(0);
 const total=valueOf(view.total,measure),largest=[...view.sources].sort((a,b)=>(valueOf(b,measure)??0)-(valueOf(a,measure)??0))[0];
 const ratios=[
  {name:tr('Leading Source'),value:total&&largest?(valueOf(largest,measure)??0)/total*100:null,readout:total&&largest?largest.name:tr('Share Not Applicable'),detail:tr('Share of %@, not a subscription quota.',metricLabel(measure))},
  {name:tr('Recorded Days'),value:view.covered/view.length*100,readout:`${view.covered} / ${view.length}`,detail:tr('A missing day is unknown, not zero.')},
  {name:tr('Known Costs'),value:view.total.records?view.total.knownCosts/view.total.records*100:null,readout:`${view.total.knownCosts} / ${view.total.records}`,detail:tr('Local records only. Missing data is not zero usage or free usage.')},
 ];
 return <><Hero {...props}/><div className="tp-instruments">{ratios.map((ratio,index)=><button key={ratio.name} type="button" aria-pressed={explanation===index} onClick={()=>setExplanation(index)}>
  {ratio.value===null?<div className="tp-mini-unavailable">{tr('Unknown')}</div>:<Gauge value={ratio.value} label={ratio.name} valueText={`${ratio.name} ${ratio.value.toLocaleString(language,{maximumFractionDigits:1})}%`}/>}<span>{ratio.name}</span><small>{ratio.readout}</small>
 </button>)}</div><p className="tp-instrument-readout" role="status">{ratios[explanation].detail}</p>
 <SectionTitle>{tr('Source Details')}</SectionTitle><SourceList {...props} bars={false}/></>;
}
export function StatisticsOverview(props:StatisticsChartProps) {
 return <div className={`tp-overview tp-overview-${props.variant}`}>{props.variant===0?<ArcSummary {...props}/>:props.variant===1?<Editorial {...props}/>:<Instruments {...props}/>}</div>;
}
