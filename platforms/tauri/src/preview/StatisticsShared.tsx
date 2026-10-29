import {useEffect,useRef,type CSSProperties,type ReactNode} from 'react';
import {ChevronRight,Info} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {ProviderLogo} from '../Dashboard';
import {statisticsCopy,valueOf,canCompare,type StatisticsView,type StatisticsMeasure,type StatisticsSource,type StatisticsChartProps} from '../statisticsData';
import './statistics-designs.css';

export function SectionTitle({children,aside}:{children:ReactNode;aside?:ReactNode}) {
 return <div className="tp-section-title"><h3>{children}</h3>{aside&&<span>{aside}</span>}</div>;
}
type SummaryProps={view:StatisticsView;measure:StatisticsMeasure;language:string};
export function ComparisonNote({view,measure,language}:SummaryProps) {
 const {tr,signed}=statisticsCopy(language),current=valueOf(view.total,measure),prior=valueOf(view.previous,measure);
 const comparable=canCompare(view,measure)&&current!==null&&prior!==null;
 return <p className="tp-comparison">{comparable?<><span>{signed(current-prior,measure)}</span> {tr('Compared With the Previous Equal Period')}{prior>0?` (${current>=prior?'+':'−'}${(Math.abs(current-prior)/prior*100).toLocaleString(language,{maximumFractionDigits:1})}%)`:prior===0&&current>0?` · ${tr('Previous total is zero; no growth rate is calculated.')}`:''}</>:tr('Incomplete records. No increase or decrease is inferred.')}</p>;
}
export function Hero({view,measure,language,small=false,comparison=true}:{small?:boolean;comparison?:boolean}&SummaryProps) {
 const {tr,format,metricLabel,unit}=statisticsCopy(language),current=valueOf(view.total,measure);
 const partial=view.partial||measure==='cost'&&!view.costComplete;
 return <div className={`tp-hero${small?' tp-hero-small':''}`}>
  <span className="tp-caption">{metricLabel(measure)}{partial?` · ${tr('Recorded Portion Only')}`:''}</span>
  <div className="tp-hero-number" data-testid="hero-total" data-value={current??'unknown'}>{format(current,measure)}<small>{unit(measure)}</small></div>
  {comparison&&<ComparisonNote view={view} measure={measure} language={language}/>}
 </div>;
}
export function SimpleTotals({view,language}:{view:StatisticsView;language:string}) {
 const {tr,format}=statisticsCopy(language);
 return <dl className="history-totals">{(['cost','tokens'] as const).map(measure=><div key={measure}><dt>{tr(measure==='cost'?'Known Cost':'Recorded Tokens')}</dt><dd data-statistics-total={measure}>{format(valueOf(view.total,measure),measure)}</dd></div>)}</dl>;
}
export function StatStrip({view,language}:{view:StatisticsView;language:string}) {
 const {tr,format}=statisticsCopy(language);
 return <dl className="tp-stat-strip"><div><dt>{tr('Known Cost')}</dt><dd>{format(view.total.cost,'cost')}<small>USD{!view.costComplete?` · ${tr('Recorded Portion Only')}`:''}</small></dd></div><div><dt>{tr('Active Days')}</dt><dd>{view.active}<small>/ {view.length}</small></dd></div><div><dt>{tr('Recorded Days')}</dt><dd>{view.covered}<small>/ {view.length}</small></dd></div></dl>;
}
export function ProviderMark({source}:{source:Pick<StatisticsSource,'key'|'name'|'color'>}) {
 return <span className="tp-provider-mark"><ProviderLogo family={source.key}/></span>;
}
export function SourceList({view,measure,language,selected,onSelect,bars=true}:SummaryProps&Pick<StatisticsChartProps,'selected'|'onSelect'>&{bars?:boolean}) {
 const {tr,format}=statisticsCopy(language),total=valueOf(view.total,measure);
 return <div className="tp-sources" aria-label={tr('Source Details')}>{view.sources.map(source=>{
  const value=valueOf(source,measure),share=total&&value!==null?value/total:0;
  return <button key={source.key} type="button" className="tp-source-row" aria-pressed={selected===source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}>
   <ProviderMark source={source}/><span className="tp-source-name">{source.name}{bars&&<span className="tp-mini-track" aria-hidden="true"><i style={{width:`${share*100}%`}}/></span>}</span>
   <span className="tp-source-number">{format(value,measure)}<small>{value===null?tr('Unknown'):total===0?tr('Share Not Applicable'):`${(share*100).toLocaleString(language,{maximumFractionDigits:1})}%`}{measure==='cost'&&source.knownCosts<source.records&&value!==null?` · ${tr('Partial')}`:''}</small></span><ChevronRight size={14} aria-hidden="true"/>
  </button>;
 })}</div>;
}
export function SourceDetail({view,selected,measure,language,onClose}:SummaryProps&{selected:string|null;onClose:()=>void}) {
 const ref=useRef<HTMLElement>(null),source=view.sources.find(item=>item.key===selected),{tr,format}=statisticsCopy(language);
 useEffect(()=>{if(selected){ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'nearest'});}},[selected]);
 if(!source)return null;
 return <section className="tp-source-detail" ref={ref} tabIndex={-1} aria-label={`${source.name} · ${tr('Model Details')}`} onKeyDown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}}}>
  <SectionTitle aside={<Button variant="ghost" size="sm" onClick={onClose}>{tr('Collapse')}</Button>}>{source.name} · {tr('Model Details')}</SectionTitle>
  <p className="tp-source-detail-total">{format(valueOf(source,measure),measure,false)}<span>{measure==='tokens'?' tokens':''}</span></p>
  <p className="tp-caption">{view.bounds.start} – {view.bounds.end}</p>
  {source.models.length?<><dl className="tp-model-list">{source.models.map(model=><div key={model.name}><dt>{model.name}</dt><dd>{format(valueOf(model,measure),measure,false)}{measure==='cost'&&model.partial&&<small>{tr('Partial')}</small>}</dd></div>)}</dl><p className="tp-caption">{tr('Model details may cover only part of the recorded total.')}</p></>:<p className="tp-caption">{tr('No model details were provided for these records.')}</p>}
 </section>;
}
export function DayReadout({view,day,measure,language}:SummaryProps&{day:string|null}) {
 const {tr,format}=statisticsCopy(language),selected=view.days.find(item=>item.date===day)??view.days.at(-1)!;
 return <div className="tp-day-readout" data-testid="day-readout"><div><span>{selected.date}</span><strong>{selected.records?format(valueOf(selected,measure),measure,false):tr('No Recorded Data')}<small>{selected.records&&measure==='tokens'?' tokens':''}</small></strong></div>
  <p className="tp-caption">{!selected.records?tr('A missing day is unknown, not zero.'):selected.incomplete||selected.partial&&measure==='cost'?tr('Recorded portion only. Missing values are not counted as zero.'):tr('%@ account or device records.',selected.records)}</p>
 </div>;
}
export function Sparkline({values,color='var(--accent)',height=48}:{values:(number|null)[];color?:string;height?:number}) {
 const max=Math.max(1,...values.filter((value):value is number=>value!==null));
 const point=(value:number,index:number)=>`${index/Math.max(values.length-1,1)*200},${height-4-value/max*(height-8)}`;
 const path=values.map((value,index)=>value===null?'':`${index===0||values[index-1]===null?'M':'L'}${point(value,index)}`).join(' ');
 return <svg className="tp-sparkline" viewBox={`0 0 200 ${height}`} preserveAspectRatio="none" aria-hidden="true"><path d={path} stroke={color} fill="none" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/>{values.map((value,index)=>value!==null&&(index===0||values[index-1]===null)&&(index===values.length-1||values[index+1]===null)?<circle key={index} cx={index/Math.max(values.length-1,1)*200} cy={height-4-value/max*(height-8)} r="2" fill={color}/>:null)}</svg>;
}
export function Coverage({view,language}:{view:StatisticsView;language:string}) {
 const {tr}=statisticsCopy(language);
 return <div className="tp-coverage"><Info size={14} aria-hidden="true"/><p>{tr('%@ of %@ days recorded; %@ of %@ costs known.',view.covered,view.length,view.total.knownCosts,view.total.records)} {tr('Local records only. Missing data is not zero usage or free usage.')}{view.partial&&<> {tr('Some sources or dates are incomplete.')}</>}</p></div>;
}
export function NoValues({measure,language,unknown=false}:{measure:StatisticsMeasure;language:string;unknown?:boolean}) {
 const {tr}=statisticsCopy(language);
 return <div className="tp-no-values"><span className="tp-dash">{unknown?'?':'0'}</span><h3>{tr(unknown?(measure==='cost'?'Cost Not Recorded':'No Recorded Data'):'Recorded Zero')}</h3><p>{tr(unknown?'Unknown values are not treated as zero.':'No positive values to divide into shares.')}</p></div>;
}
export function ReviewFoot({children}:{children:ReactNode}) {return <p className="tp-chart-note">{children}</p>;}
