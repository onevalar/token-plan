import {useId,useState,type CSSProperties,type KeyboardEvent,type ReactNode} from 'react';
import SegmentedControl from '../components/arc/segmented-control/segmented-control';
import {ProviderMark,ReviewFoot,SectionTitle} from './StatisticsShared';
import {canCompare,statisticsCopy,valueOf,type StatisticsDay,type StatisticsView,type StatisticsMeasure,type StatisticsSource,type StatisticsChartProps} from '../statisticsData';
import './statistics-compare.css';

type Controls=Pick<StatisticsChartProps,'selected'|'onSelect'>;
type Summary=Pick<StatisticsChartProps,'view'|'measure'|'language'>;
function deltaText(value:number,measure:StatisticsMeasure,language:string) {
 const {format}=statisticsCopy(language);
 // The comparison ledger, unlike the overview, keeps non-compact exact values.
 return `${value>0?'+':value<0?'−':''}${format(Math.abs(value),measure,false)}`;
}
const extent=(values:(number|null)[])=>{
 const known=values.filter((value):value is number=>value!==null);
 return known.length?Math.max(0,...known):null;
};
const completeDays=(days:StatisticsDay[],length:number,measure:StatisticsMeasure)=>days.length===length&&days.every(day=>
 day.records>0&&!day.incomplete&&valueOf(day,measure)!==null&&(measure==='tokens'||!day.partial));

function comparisonIssue(view:StatisticsView,measure:StatisticsMeasure,language:string) {
 const {tr}=statisticsCopy(language);
 if(view.days.length!==view.previousDays.length||view.days.length!==view.length)return tr('Periods have different lengths. No change is calculated.');
 if(!view.total.records||!view.previous.records)return tr('One period has no records. Unknown is not zero; no change is inferred.');
 if(view.covered<view.length||view.previousCovered<view.length)return tr('Some dates are missing. Only recorded values are shown; gaps are not filled with zero and no change is inferred.');
 if(measure==='cost'&&(!view.costComplete||view.previous.knownCosts<view.previous.records))return tr('Costs are incomplete. Only known amounts are shown; no difference is calculated and unknown does not mean free.');
 if(!canCompare(view,measure))return tr('Records are incomplete. No increase or decrease is inferred.');
 return null;
}

function sourcePair(source:StatisticsSource,view:StatisticsView,measure:StatisticsMeasure) {
 const current=valueOf(source,measure),previous=valueOf(source.previous,measure);
 const comparable=canCompare(view,measure)&&completeDays(source.days,view.length,measure)&&completeDays(source.previousDays,view.length,measure);
 // Costs can contain fractions of a cent. Only the display formatter rounds.
 return {current,previous,delta:comparable&&current!==null&&previous!==null?current-previous:null};
}

function moveSource(event:KeyboardEvent<HTMLButtonElement>) {
 if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 const buttons=Array.from(event.currentTarget.closest('[data-source-list]')!.querySelectorAll<HTMLButtonElement>('button[data-source]'));
 const index=buttons.indexOf(event.currentTarget),last=buttons.length-1;
 const target=event.key==='Home'?0:event.key==='End'?last
  :event.key==='ArrowDown'||event.key==='ArrowRight'?(index+1)%buttons.length:(index+last)%buttons.length;
 event.preventDefault();
 event.stopPropagation();
 // Focus is exploration, not activation. Native Enter/Space opens details;
 // the parent captures this originating button and restores focus on close.
 buttons[target].focus();
}

function SourceButton({source,controls,className,children,label}:{source:StatisticsSource;controls:Controls;className:string;children:ReactNode;label?:string}) {
 return <button type="button" className={`tp-compare-source-button ${className}`} data-source={source.key}
  aria-label={label} aria-pressed={controls.selected===source.key}
  style={{'--source-color':source.color} as CSSProperties}
  onClick={()=>controls.onSelect(controls.selected===source.key?null:source.key)} onKeyDown={moveSource}>
  {children}
 </button>;
}

function PeriodTotals({view,measure,language}:Summary) {
 const {tr,format,shortDate}=statisticsCopy(language);
 return <dl className="tp-compare-totals">{(['previous','current'] as const).map(period=>{
  const prior=period==='previous',item=prior?view.previous:view.total,value=valueOf(item,measure),bounds=prior?view.priorBounds:view.bounds;
  const partial=value!==null&&((prior?view.previousPartial:view.partial)||measure==='cost'&&item.knownCosts<item.records);
  const dates=bounds.start===bounds.end?shortDate(bounds.start):`${shortDate(bounds.start)}–${shortDate(bounds.end)}`;
  return <div key={period}>
   <dt><i className={`tp-compare-dot ${prior?'is-prior':'is-current'}`} aria-hidden="true"/>{tr(prior?'Previous Period':'Current Period')}<span>{dates}</span></dt>
   <dd data-testid={prior?undefined:'hero-total'} data-value={prior?undefined:(value??'unknown')}>{format(value,measure,false)}{partial&&<small>{tr('Recorded Portion Only')}</small>}</dd>
  </div>;
 })}</dl>;
}

function PairValues({source,measure,language}:{source:StatisticsSource;measure:StatisticsMeasure;language:string}) {
 const {tr,format}=statisticsCopy(language);
 return <span className="tp-compare-values">{(['current','previous'] as const).map(period=>{
  const prior=period==='previous',item=prior?source.previous:source,days=prior?source.previousDays:source.days;
  const value=valueOf(item,measure),partial=value!==null&&(days.some(day=>!day.records||day.incomplete)||measure==='cost'&&item.knownCosts<item.records);
  return <span className="tp-compare-value" key={period}>
   <span className="tp-compare-sr-only">{tr(prior?'Previous Period':'Current Period')} </span>
   <i className={`tp-compare-dot ${prior?'is-prior':'is-current'}`} aria-hidden="true"/>
   <span><b>{format(value,measure,false)}</b>{partial&&<small>{tr('Recorded Portion Only')}</small>}</span>
  </span>;
 })}</span>;
}

function Dumbbells(props:StatisticsChartProps) {
 const {view,measure,language}=props,issue=comparisonIssue(view,measure,language),{tr,format,unit}=statisticsCopy(language);
 const maximum=extent(view.sources.flatMap(source=>[valueOf(source,measure),valueOf(source.previous,measure)]));
 const x=(value:number)=>8+value/(maximum||1)*224;
 return <>
  <SectionTitle aside={tr('%@-Day Period · %@',view.length.toLocaleString(language),unit(measure))}>{tr('Paired Comparison')}</SectionTitle>
  <PeriodTotals view={view} measure={measure} language={language}/>
  <p className="tp-compare-context">{issue??tr('A shared scale shows the difference between each source’s two periods.')}</p>
  <div className="tp-compare-dumbbell-head" aria-hidden="true">
   <span className="tp-compare-ruler"><span>{(0).toLocaleString(language)}</span><span>{maximum===null?tr('Scale Unknown'):format(maximum,measure)}</span></span>
   <span>{tr('Exact Period Totals')}</span>
  </div>
  <div className="tp-compare-dumbbells" data-source-list role="group" aria-label={tr('Paired source comparisons. Arrow keys browse; Enter or Space opens details.')}>
   {view.sources.map(source=>{
    const pair=sourcePair(source,view,measure);
    return <SourceButton key={source.key} source={source} controls={props} className="tp-compare-dumbbell-row">
     <span className="tp-compare-source-name"><ProviderMark source={source}/><strong>{source.name}</strong></span>
     <span className="tp-compare-difference" data-delta={pair.delta??'unknown'}>{pair.delta===null?tr('Not Compared'):pair.delta===0?tr('Same in Both Periods'):deltaText(pair.delta,measure,language)}</span>
     <svg className="tp-compare-dumbbell" viewBox="0 0 240 44" aria-hidden="true">
      <path d="M8 22H232 M8 17V27 M120 19V25 M232 17V27" className="tp-compare-grid-line"/>
      {pair.delta!==null&&<line x1={x(pair.previous!)} x2={x(pair.current!)} y1="22" y2="22" className="tp-compare-join"/>}
      {pair.previous!==null&&<circle cx={x(pair.previous)} cy="22" r="5" className="tp-compare-prior-point"/>}
      {pair.current!==null&&<circle cx={x(pair.current)} cy="22" r="3.3" className="tp-compare-current-point"/>}
     </svg>
     <PairValues source={source} measure={measure} language={language}/>
    </SourceButton>;
   })}
  </div>
  <ReviewFoot>{tr('Filled points are current; hollow points are previous. Every source shares a scale starting at zero.')} {tr(issue?'Incomplete periods are not connected.':'Connections show differences, not good or bad outcomes.')} {tr('Arrow keys browse sources. Enter, Space, or a click opens details.')}</ReviewFoot>
 </>;
}

function TrendPlot({source,measure,maximum}:{source:StatisticsSource;measure:StatisticsMeasure;maximum:number|null}) {
 const values=source.days.map(day=>valueOf(day,measure)),previous=source.previousDays.map(day=>valueOf(day,measure));
 const x=(index:number)=>values.length===1?120:6+index/(values.length-1)*228,y=(value:number)=>70-value/(maximum||1)*62;
 const path=(series:(number|null)[])=>series.map((value,index)=>value===null?'':`${index===0||series[index-1]===null?'M':'L'}${x(index)},${y(value)}`).filter(Boolean).join(' ');
 return <svg className="tp-compare-trend" viewBox="0 0 240 80" aria-hidden="true">
  <path d="M6 8H234 M6 39H234 M6 70H234" className="tp-compare-grid-line"/>
  <path d={path(previous)} className="tp-compare-prior-line"/>
  <path d={path(values)} className="tp-compare-current-line"/>
  {previous.map((value,index)=>value!==null&&<circle key={`p-${index}`} cx={x(index)} cy={y(value)} r="2.6" className="tp-compare-prior-point"/>)}
  {values.map((value,index)=>value!==null&&<circle key={`c-${index}`} cx={x(index)} cy={y(value)} r="1.8" className="tp-compare-current-point"/>)}
 </svg>;
}

function ParallelTrends(props:StatisticsChartProps) {
 const {view,measure,language}=props,[scale,setScale]=useState('shared'),scaleId=useId(),{tr,format,unit}=statisticsCopy(language);
 const issue=comparisonIssue(view,measure,language);
 const sharedMax=extent(view.sources.flatMap(source=>[...source.days,...source.previousDays].map(day=>valueOf(day,measure))));
 return <>
  <SectionTitle aside={tr('%@-Day Period · %@',view.length.toLocaleString(language),unit(measure))}>{tr('Parallel Trends')}</SectionTitle>
  <PeriodTotals view={view} measure={measure} language={language}/>
  <div className="tp-compare-scale-control" aria-describedby={scaleId}>
   <SegmentedControl label={tr('Trend Vertical Scale')} value={scale} onValueChange={setScale}
    options={[{value:'shared',label:tr('Shared Scale')},{value:'independent',label:tr('Independent Scales')}]}/>
  </div>
  <p className="tp-compare-scale-note" id={scaleId} role="status">{tr(scale==='shared'
   ?'All charts share a vertical scale, so heights can be compared as recorded amounts.'
   :'Each source has its own scale. Compare shapes, not amounts across charts.')}</p>
  {issue&&<p className="tp-compare-context">{issue}</p>}
  <div className="tp-compare-trends" data-source-list role="group" aria-label={tr('Daily source trends. Arrow keys browse; Enter or Space opens details.')}>
   {view.sources.map(source=>{
    const maximum=scale==='shared'?sharedMax:extent([...source.days,...source.previousDays].map(day=>valueOf(day,measure)));
    return <SourceButton key={source.key} source={source} controls={props} className="tp-compare-trend-card">
     <span className="tp-compare-source-name"><ProviderMark source={source}/><strong>{source.name}</strong></span>
     <span className="tp-compare-domain">{maximum===null?tr('Scale Unknown'):maximum===0?tr('Only Zero Values'):`${(0).toLocaleString(language)}–${format(maximum,measure)}`}</span>
     <span className="tp-compare-trend-frame" data-scale-max={maximum??'unknown'}>
      <TrendPlot source={source} measure={measure} maximum={maximum}/>
      <span className="tp-compare-time-axis"><span>{tr('Day %@',(1).toLocaleString(language))}</span>{view.length>1&&<span>{tr('Day %@',view.length.toLocaleString(language))}</span>}</span>
     </span>
     <PairValues source={source} measure={measure} language={language}/>
    </SourceButton>;
   })}
  </div>
  <ReviewFoot>{tr('Solid lines and filled points are current; dashed lines and hollow points are previous. Periods align by day number, gaps stay unknown, and exact values are period totals.')} {view.length===1&&tr('One day is a point, not a trend.')} {tr('Arrow keys browse sources. Enter, Space, or a click opens details.')}</ReviewFoot>
 </>;
}

type WaterStep={key:string;name:string;from:number;to:number;delta:number;source?:StatisticsSource};
// Grouping real history rows changes floating-point summation order. Bound only
// that rounding error by magnitude and operation count, never by a cent or a
// fixed absolute epsilon (which would swallow legitimate micro-cost differences).
function reconciles(actual:number,expected:number,operations:number,scale=Math.max(Math.abs(actual),Math.abs(expected))) {
 return Math.abs(actual-expected)<=Number.EPSILON*Math.max(1,operations)*scale*4;
}

function Waterfall(props:StatisticsChartProps) {
 const {view,measure,language}=props,current=valueOf(view.total,measure),previous=valueOf(view.previous,measure);
 const {tr,format,unit}=statisticsCopy(language),pairs=view.sources.map(source=>({source,...sourcePair(source,view,measure)}));
 let issue=comparisonIssue(view,measure,language);
 if(!issue&&pairs.some(pair=>pair.delta===null))issue=tr('Some sources have incomplete records. The total difference is not broken down.');
 const operations=Math.max(view.total.records,view.previous.records)+pairs.length;
 if(!issue) {
  const sourcePrevious=pairs.reduce((sum,pair)=>sum+pair.previous!,0),sourceCurrent=pairs.reduce((sum,pair)=>sum+pair.current!,0);
  if(previous===null||current===null||!reconciles(sourcePrevious,previous,operations)||!reconciles(sourceCurrent,current,operations)) {
   issue=tr('Source records do not reconcile with the period totals. The difference is not broken down.');
  }
 }
 const steps:WaterStep[]=[];
 if(!issue) {
  let running=previous!;
  steps.push({key:'previous',name:tr('Previous'),from:0,to:running,delta:running});
  pairs.forEach(({source,delta})=>{
   steps.push({key:source.key,name:source.name,from:running,to:running+delta!,delta:delta!,source});
   running+=delta!;
  });
  const scale=Math.abs(previous!)+pairs.reduce((sum,pair)=>sum+Math.abs(pair.delta!),0);
  if(!reconciles(running,current!,operations,Math.max(scale,Math.abs(current!)))) {
   issue=tr('Source records do not reconcile with the period totals. The difference is not broken down.');
  }
  steps.push({key:'current',name:tr('Current'),from:0,to:current!,delta:current!});
 }
 const peak=Math.max(0,...steps.flatMap(step=>[step.from,step.to])),ceiling=peak*1.14;
 const percent=(value:number)=>value/(ceiling||1)*100,net=issue?null:current!-previous!;
 return <>
  <SectionTitle aside={tr('%@-Day Period · %@',view.length.toLocaleString(language),unit(measure))}>{tr('Change Breakdown')}</SectionTitle>
  <div className="tp-compare-net">
   <span className="tp-caption">{tr(issue?'Recorded Period Totals':'Current − Previous')}</span>
   <strong>{net===null?tr('Difference Unavailable'):deltaText(net,measure,language)}</strong>
   <span className="tp-caption">{net===null?issue:tr(net===0?'Net change is zero; individual sources may still have changed.':'An increase or decrease describes usage, not a good or bad outcome.')}</span>
  </div>
  {!issue&&<div className="tp-compare-waterfall" role="group" aria-label={tr('Waterfall from previous to current total. Arrow keys browse sources; Enter or Space opens details.')}>
   <div className="tp-compare-water-axis" aria-hidden="true"><span>{format(ceiling,measure)}</span><span>{peak===0?'':format(ceiling/2,measure)}</span><span>{(0).toLocaleString(language)}</span></div>
   <div className="tp-compare-water-scroll">
    <div className="tp-compare-water-steps" style={{'--step-count':steps.length} as CSSProperties} data-source-list>
     {steps.map((step,index)=>{
      const graphic=<>
       <span className="tp-compare-step-space" aria-hidden="true" data-from={step.from} data-to={step.to} data-delta={step.delta}>
        <i className={`tp-compare-water-bar${step.key==='previous'?' is-prior-total':''}${step.key==='current'?' is-current-total':''}${step.delta===0?' is-zero':''}`}
         style={{bottom:`${percent(Math.min(step.from,step.to))}%`,height:`${percent(Math.abs(step.to-step.from))}%`}}/>
        {index<steps.length-1&&<i className="tp-compare-water-connector" style={{bottom:`${percent(step.to)}%`}}/>}
        {step.source&&<b className="tp-compare-water-sign" style={{bottom:`calc(${percent(Math.max(step.from,step.to))}% + 5px)`}}>{step.delta>0?'+':step.delta<0?'−':'='}</b>}
       </span>
       <span className="tp-compare-step-label">{step.source?index.toLocaleString(language,{minimumIntegerDigits:2}):step.name}</span>
      </>;
      return step.source?<SourceButton key={step.key} source={step.source} controls={props} className="tp-compare-water-step"
       label={tr('%@: change %@ %@. Open model details.',step.name,deltaText(step.delta,measure,language),unit(measure))}>{graphic}</SourceButton>
       :<div key={step.key} className="tp-compare-water-total">{graphic}</div>;
     })}
    </div>
   </div>
  </div>}
  <PeriodTotals view={view} measure={measure} language={language}/>
  <div className="tp-compare-contribution-head"><span>{tr(issue?'Recorded Sources':'Source Contributions')}</span><span>{issue?tr('Exact Period Totals'):tr('Change · %@',unit(measure))}</span></div>
  <div className="tp-compare-contributions" data-source-list role="group" aria-label={tr('Source changes. Arrow keys browse; Enter or Space opens details.')}>
   {pairs.map(({source,delta},index)=><SourceButton key={source.key} source={source} controls={props} className="tp-compare-contribution">
    <span className="tp-compare-source-name"><span className="tp-compare-index">{(index+1).toLocaleString(language,{minimumIntegerDigits:2})}</span><ProviderMark source={source}/><strong>{source.name}</strong></span>
    {issue?<PairValues source={source} measure={measure} language={language}/>:<span className="tp-compare-contribution-value" data-delta={delta}><b>{deltaText(delta!,measure,language)}</b><small>{tr(delta===0?'No Change':delta!>0?'Increase':'Decrease')}</small></span>}
   </SourceButton>)}
  </div>
  <ReviewFoot>{tr(issue?'The waterfall requires complete records; an unknown difference is never replaced with zero.':'Start at the hollow previous total, add each source’s change, and reach the filled current total. Colors identify sources; zero changes are short lines.')} {tr('Arrow keys browse sources. Enter, Space, or a click opens details.')}</ReviewFoot>
 </>;
}

export function StatisticsCompare(props:StatisticsChartProps) {
 const {tr}=statisticsCopy(props.language),selected=props.view.sources.find(source=>source.key===props.selected);
 return <section className={`tp-compare tp-compare-d${props.variant+1}`} aria-label={tr(props.variant===0?'Paired Comparison':props.variant===1?'Parallel Trends':'Change Breakdown')}>
  {props.variant===0?<Dumbbells {...props}/>:props.variant===1?<ParallelTrends {...props}/>:<Waterfall {...props}/>}
  <p className="tp-compare-sr-only" role="status">{selected?tr('%@ selected. Model details are below the chart.',selected.name):tr('No source is selected.')}</p>
 </section>;
}
