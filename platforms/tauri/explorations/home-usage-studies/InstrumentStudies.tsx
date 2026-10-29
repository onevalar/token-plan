import {useState,type KeyboardEvent} from 'react';
import {isQuotaMetric} from '../../src/Metrics';
import type {Metric} from '../../src/desktop';
import {readQuota,clamp,metricAttributes,type StudyProps,type Reading} from './data';
import {Amount,Expiries,MetricLabel,Value,Status,Reset,Meter,Track,ScaleTicks,point,arcPath} from './Shared';
import './instrument-studies.css';

function Needle({r,remaining}:{r:Reading;remaining:boolean}) {
 const angle=-130+260*clamp(r.value??0)/100,end=point(angle,52),tail=point(angle,-7),boundary=remaining?20:80;
 const a=point(-130+260*boundary/100,60),b=point(-130+260*boundary/100,73);
 return <svg viewBox="0 0 160 145" aria-hidden="true" focusable="false">
  <path d={arcPath(-130,130,73)} className="hu-instrument-rim"/>
  <ScaleTicks/>
  <path d={arcPath(-130,130,55)} className="hu-instrument-inner"/>
  <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="hu-instrument-boundary"/>
  {r.value!==null&&<><path d={arcPath(-130,-130+260*clamp(r.value)/100,73)} className="hu-instrument-sweep" data-zero={clamp(r.value)===0}/>
   <line x1={tail.x} y1={tail.y} x2={end.x} y2={end.y} className="hu-instrument-needle" data-needle-value={clamp(r.value)}/>
   <circle cx="80" cy="80" r="4" className="hu-instrument-hub"/></>}
  <text x="15" y="137" className="hu-instrument-label">0</text><text x="145" y="137" textAnchor="end" className="hu-instrument-label">100</text>
 </svg>;
}
function Dial({r,remaining}:{r:Reading;remaining:boolean}) {
 return <div className="hu-instrument-dial"><Needle r={r} remaining={remaining}/><div className="hu-instrument-readout"><Value r={r}/></div></div>;
}
function SideDial({r,remaining}:{r:Reading;remaining:boolean}) {
 const v=clamp(r.value??0),p=point(180*v/100,59,4,72),b=point(180*(remaining?20:80)/100,65,4,72);
 return <div className="hu-side-scale" aria-hidden="true"><span>0</span><svg viewBox="0 0 96 144" focusable="false">
  <ScaleTicks start={0} span={180} radius={69} cx={4} cy={72} count={31}/>
  <path className="hu-chart-track" d={arcPath(0,180,59,4,72)} strokeWidth="3"/>
  {r.value!==null&&<><path className="hu-chart-fill" d={arcPath(0,180*v/100,59,4,72)} strokeWidth="3" opacity={v===0?0:1}/><circle cx={p.x} cy={p.y} r="4" className="hu-side-dot"/></>}
  <circle cx={b.x} cy={b.y} r="2" className="hu-side-boundary"/>
 </svg><span>100</span></div>;
}

function Instrument({metric,variant,...props}:Omit<StudyProps,'metrics'>&{metric:Metric}) {
 const r=readQuota(metric,props);
 if(variant===1)return <div className="hu-side-instrument" {...metricAttributes(metric,r)}>
  <div className="hu-side-reading"><MetricLabel metric={metric} r={r} {...props}/><Value r={r}/><span className="hu-side-mode">{r.mode}</span><Reset metric={metric} now={props.now}/><Status r={r}/></div>
  <Meter r={r}><SideDial r={r} remaining={props.remaining}/></Meter><Expiries metric={metric}/>
 </div>;
 return <div className="hu-needle-instrument" {...metricAttributes(metric,r)}>
  <MetricLabel metric={metric} r={r} {...props}/>
  <Meter r={r}><Dial r={r} remaining={props.remaining}/></Meter>
  <div className="hu-instrument-meta"><Reset metric={metric} now={props.now}/><Status r={r}/></div><Expiries metric={metric}/>
 </div>;
}

function PrimaryInstruments(props:StudyProps) {
 const {metrics,remaining,now,selected,onSelect}=props;
 const [focusId,setFocusId]=useState('');
 const quotas=metrics.filter(isQuotaMetric),focus=quotas.find(m=>m.id===focusId)??quotas[0];
 if(!focus)return <>{metrics.map(m=><Amount key={m.id} metric={m} {...props}/>)}</>;
 const r=readQuota(focus,props);
 const move=(event:KeyboardEvent<HTMLButtonElement>)=>{
  const buttons=Array.from(event.currentTarget.closest('.hu-primary-list')!.querySelectorAll<HTMLButtonElement>('.hu-primary-select'));
  const i=buttons.indexOf(event.currentTarget),next=event.key==='ArrowDown'?(i+1)%buttons.length:event.key==='ArrowUp'?(i+buttons.length-1)%buttons.length:event.key==='Home'?0:event.key==='End'?buttons.length-1:-1;
  if(next>=0){event.preventDefault();event.stopPropagation();buttons[next].focus();}
 };
 return <div className="hu-primary-instruments">
  <div className="hu-primary-hero" data-tone={r.tone} data-focused-metric={focus.id}>
   <div className="hu-primary-face" aria-hidden="true"><Needle r={r} remaining={remaining}/><span className="hu-value hu-primary-number">{r.valueText}</span></div>
   <div className="hu-primary-context"><MetricLabel metric={focus} r={r} selected={selected} onSelect={onSelect}/><span>{r.mode}</span><Reset metric={focus} now={now}/><Status r={r}/></div>
  </div>
  <div className="hu-primary-list" role="group" aria-label="选择放大的额度；上下键移动，回车确认">{metrics.map(m=>{
   if(!isQuotaMetric(m))return <Amount key={m.id} metric={m} {...props}/>;
   const q=readQuota(m,props);
   return <div key={m.id} className="hu-primary-row" {...metricAttributes(m,q)}>
    <button type="button" className="hu-primary-select" aria-pressed={m.id===focus.id} aria-label={`放大 ${q.name} 刻盘`} onClick={()=>setFocusId(m.id)} onKeyDown={move}>
     <span>{q.name}<small><Reset metric={m} now={now}/></small></span><Value r={q} small/>
    </button>
    <Meter r={q}><Track value={q.value}/></Meter><Status r={q}/><Expiries metric={m}/>
   </div>;
  })}</div>
 </div>;
}

export function InstrumentStudies(props:StudyProps) {
 if(props.variant===2)return <PrimaryInstruments {...props}/>;
 return <div className="hu-instruments" data-variant={props.variant}>{props.metrics.map(metric=>isQuotaMetric(metric)?
  <Instrument key={metric.id} metric={metric} {...props}/>:<Amount key={metric.id} metric={metric} {...props}/>)}</div>;
}
