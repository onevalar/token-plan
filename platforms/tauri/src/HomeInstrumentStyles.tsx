import {useState,type KeyboardEvent} from 'react';
import {isQuotaMetric} from './Metrics';
import type {Metric} from './desktop';
import {preciseQuotaReading} from './homeUsage';
import {providerText} from './providerText';
import {Amount,Expiries,MetricLabel,Value,Status,Reset,Meter,Track,ScaleTicks,point,arcPath,clamp,metricAttributes,type Reading,type DesignProps} from './HomeQuotaParts';
import './home-instrument-styles.css';

function Needle({r,remaining=false}:{r:Reading;remaining?:boolean}) {
 const angle=-130+260*clamp(r.value??0)/100,end=point(angle,52),tail=point(angle,-7),boundary=remaining?20:80;
 const a=point(-130+260*boundary/100,60),b=point(-130+260*boundary/100,73);
 return <svg viewBox="0 0 160 145" aria-hidden="true" focusable="false">
  <path d={arcPath(-130,130,73)} className="hq-instrument-rim"/><ScaleTicks/>
  <path d={arcPath(-130,130,55)} className="hq-instrument-inner"/>
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="hq-instrument-boundary"/>
  {r.value!==null&&<><path d={arcPath(-130,-130+260*clamp(r.value)/100,73)} className="hq-instrument-sweep" data-zero={clamp(r.value)===0}/>
   <line x1={tail.x} y1={tail.y} x2={end.x} y2={end.y} className="hq-instrument-needle" data-needle-value={clamp(r.value)}/>
   <circle cx="80" cy="80" r="4" className="hq-instrument-hub"/></>}
  <text x="15" y="137" className="hq-instrument-label">0</text><text x="145" y="137" textAnchor="end" className="hq-instrument-label">100</text>
 </svg>;
}
function Dial({r,remaining}:{r:Reading;remaining?:boolean}) {
 return <div className="hq-instrument-dial"><Needle r={r} remaining={remaining}/><div className="hq-instrument-readout"><Value r={r}/></div></div>;
}
function SideDial({r,remaining=false}:{r:Reading;remaining?:boolean}) {
 const v=clamp(r.value??0),p=point(180*v/100,59,4,72),b=point(180*(remaining?20:80)/100,65,4,72);
 return <div className="hq-side-scale" aria-hidden="true"><span>0</span><svg viewBox="0 0 96 144" focusable="false">
  <ScaleTicks start={0} span={180} radius={69} cx={4} cy={72} count={31}/>
  <path className="hq-chart-track" d={arcPath(0,180,59,4,72)} strokeWidth="3"/>
  {r.value!==null&&<><path className="hq-chart-fill" d={arcPath(0,180*v/100,59,4,72)} strokeWidth="3" opacity={v===0?0:1}/><circle cx={p.x} cy={p.y} r="4" className="hq-side-dot" data-needle-value={v}/></>}
  <circle cx={b.x} cy={b.y} r="2" className="hq-side-boundary"/>
 </svg><span>100</span></div>;
}

function Instrument({metric,variant,...props}:Omit<DesignProps,'metrics'>&{metric:Metric}) {
 const r=preciseQuotaReading({metric,...props});
 if(variant===1)return <div className="hq-side-instrument" {...metricAttributes(metric,r)}>
  <div className="hq-side-reading"><MetricLabel metric={metric} r={r} {...props}/><Value r={r}/><span className="hq-side-mode">{r.mode}</span><Reset metric={metric} {...props}/><Status r={r} missing={props.missing}/></div>
  <Meter r={r}><SideDial r={r} remaining={props.remaining}/></Meter><Expiries metric={metric} {...props}/>
 </div>;
 return <div className="hq-needle-instrument" {...metricAttributes(metric,r)}>
  <MetricLabel metric={metric} r={r} {...props}/><Meter r={r}><Dial r={r} remaining={props.remaining}/></Meter>
  <div className="hq-instrument-meta"><Reset metric={metric} {...props}/><Status r={r} missing={props.missing}/></div><Expiries metric={metric} {...props}/>
 </div>;
}

function PrimaryInstruments(props:DesignProps) {
 const {metrics,remaining,language}=props,[focusId,setFocusId]=useState('');
 const quotas=metrics.filter(isQuotaMetric),focus=quotas.find(m=>m.id===focusId)??quotas[0];
 if(!focus)return <>{metrics.map(metric=><Amount key={metric.id} metric={metric} {...props}/>)}</>;
 const r=preciseQuotaReading({metric:focus,...props});
 const move=(event:KeyboardEvent<HTMLButtonElement>)=>{
  const buttons=Array.from(event.currentTarget.closest('.hq-primary-list')!.querySelectorAll<HTMLButtonElement>('.hq-primary-select'));
  const i=buttons.indexOf(event.currentTarget),next=event.key==='ArrowDown'?(i+1)%buttons.length:event.key==='ArrowUp'?(i+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:-1;
  // Manual activation: navigation moves only focus. Native Enter/Space clicks select the larger dial.
  if(next>=0){event.preventDefault();event.stopPropagation();buttons[next].focus();}
 };
 return <div className="hq-primary-instruments">
  <div className="hq-primary-hero" data-tone={r.tone} data-focused-metric={focus.id}>
   <div className="hq-primary-face" aria-hidden="true"><Needle r={r} remaining={remaining}/><span className="hq-value hq-primary-number">{r.value===null?'—':r.valueText}</span></div>
   <div className="hq-primary-context"><MetricLabel metric={focus} r={r} {...props}/><span>{r.mode}</span><Reset metric={focus} {...props}/><Status r={r} missing={props.missing}/></div>
  </div>
  <div className="hq-primary-list" role="group" aria-label={providerText('Choose a Quota to Enlarge',language)}>{metrics.map(metric=>{
   if(!isQuotaMetric(metric))return <Amount key={metric.id} metric={metric} {...props}/>;
   const q=preciseQuotaReading({metric,...props});
   return <div key={metric.id} className="hq-primary-row" {...metricAttributes(metric,q)}>
    <button type="button" className="hq-primary-select" aria-pressed={metric.id===focus.id} aria-label={providerText('Enlarge %@ Dial',language).replace('%@',q.name)} onClick={()=>setFocusId(metric.id)} onKeyDown={move}>
     <span>{q.name}<small><Reset metric={metric} {...props}/></small></span><Value r={q} small/>
    </button>
    <Meter r={q}><Track value={q.value}/></Meter><Status r={q} missing={props.missing}/><Expiries metric={metric} {...props}/>
   </div>;
  })}</div>
 </div>;
}

export function HomeInstrumentStyles(props:DesignProps) {
 if(props.variant===2)return <PrimaryInstruments {...props}/>;
 return <div className="hq-instruments" data-variant={props.variant}>{props.metrics.map(metric=>isQuotaMetric(metric)?
  <Instrument key={metric.id} metric={metric} {...props}/>:<Amount key={metric.id} metric={metric} {...props}/>)}</div>;
}
