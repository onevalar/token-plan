import {useId} from 'react';
import type {Metric} from '../../src/desktop';
import {isQuotaMetric} from '../../src/Metrics';
import {clamp,cycleOf,metricAttributes,percent,readQuota,type Reading,type StudyProps} from './data';
import {Amount,Expiries,Meter,MetricLabel,Reset,ScaleTicks,Value,Status,point} from './Shared';
import './cycle-studies.css';

type Cycle=ReturnType<typeof cycleOf>;
type QuotaProps=Omit<StudyProps,'metrics'>&{metric:Metric};

/** Each window keeps its own denominator, time metadata, and place in the metric list. */
export function CycleStudies({metrics,...props}:StudyProps) {
 return <div className="hu-cycles" data-cycle-study={`C${props.variant+1}`}>
  {metrics.map(metric=>isQuotaMetric(metric)?<CycleQuota key={metric.id} metric={metric} {...props}/>:<Amount key={metric.id} metric={metric} remaining={props.remaining} now={props.now} missing={props.missing}/>)}
 </div>;
}

function CycleQuota({metric,variant,...props}:QuotaProps) {
 const r=readQuota(metric,props),cycle=cycleOf(metric,props.now);
 return <div className="hu-cycle-item" {...metricAttributes(metric,r)} data-cycle-elapsed={cycle.elapsed??'unknown'}>
  <div className="hu-cycle-heading"><MetricLabel metric={metric} r={r} {...props}/><Status r={r}/></div>
  {variant===0?<Racetrack r={r} cycle={cycle}/>:variant===1?<ParallelLanes r={r} cycle={cycle}/>:<div className="hu-cycle-clock-row">
   <figure className="hu-cycle-clock">
    <ClockDial elapsed={cycle.elapsed}/>
    <figcaption><span>周期已过</span><Elapsed cycle={cycle}/></figcaption>
   </figure>
   <div className="hu-cycle-clock-reading">
    <span className="hu-cycle-mode">{r.mode}额度</span>
    <Meter r={r}><Value r={r}/></Meter>
    <Reset metric={metric} now={props.now}/>
   </div>
  </div>}
  {variant!==2&&<div className="hu-cycle-reset"><Reset metric={metric} now={props.now}/></div>}
  {cycle.elapsed===null&&<p className="hu-cycle-unavailable">周期进度未知，不显示时间位置</p>}
  <Expiries metric={metric}/>
 </div>;
}

function Elapsed({cycle}:{cycle:Cycle}) {
 return <span className="hu-cycle-elapsed" data-testid="cycle-elapsed">{cycle.elapsed===null?'—':percent(Math.round(cycle.elapsed*10)/10)}</span>;
}

function Racetrack({r,cycle}:{r:Reading;cycle:Cycle}) {
 const mask=useId();
 return <>
  <div className="hu-cycle-racetrack">
   <Meter r={r}>
    <svg viewBox="0 0 320 128" aria-hidden="true" focusable="false">
     <defs><mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="128">
      {cycle.elapsed!==null&&<rect x="18" y="18" width="284" height="92" rx="46" fill="none" stroke="white" strokeWidth="6" pathLength="100" strokeDasharray={`${clamp(cycle.elapsed)} 100`}/>}
     </mask></defs>
     <rect className="hu-cycle-race-base" x="6" y="6" width="308" height="116" rx="58" pathLength="100"/>
     {r.value!==null&&r.value>0&&<rect className="hu-cycle-race-quota" data-quota-fill={clamp(r.value)} x="6" y="6" width="308" height="116" rx="58" pathLength="100" strokeDasharray={`${clamp(r.value)} 100`}/>}
     <rect className="hu-cycle-race-time-base" x="18" y="18" width="284" height="92" rx="46" pathLength="100" strokeDasharray="1 1"/>
     {cycle.elapsed!==null&&<rect className="hu-cycle-race-time" data-time-fill={cycle.elapsed} x="18" y="18" width="284" height="92" rx="46" pathLength="100" strokeDasharray="1 1" mask={`url(#${mask})`}/>}
    </svg>
   </Meter>
   <div className="hu-cycle-race-reading" aria-hidden="true">
    <Value r={r}/><span className="hu-cycle-mode"><i className="hu-cycle-key"/>{r.mode}额度 · 外圈</span>
   </div>
  </div>
  <div className="hu-cycle-race-legend"><span><i className="hu-cycle-key hu-cycle-key-time" aria-hidden="true"/>周期已过 · 内圈</span><Elapsed cycle={cycle}/></div>
 </>;
}

function ParallelLanes({r,cycle}:{r:Reading;cycle:Cycle}) {
 return <div className="hu-cycle-lanes">
  <span className="hu-cycle-mode">{r.mode}额度</span>
  <Meter r={r}><Lane value={r.value}/></Meter>
  <Value r={r} small/>
  <span className="hu-cycle-mode">周期已过</span>
  <Lane value={cycle.elapsed} time/>
  <Elapsed cycle={cycle}/>
 </div>;
}

function Lane({value,time=false}:{value:number|null;time?:boolean}) {
 return <div className="hu-track hu-cycle-lane" data-channel={time?'time':'quota'} data-unknown={value===null} data-fill={value===null?'unknown':clamp(value)} aria-hidden="true">
  {value!==null&&<><span style={{transform:`scaleX(${clamp(value)/100})`}}/><i className="hu-cycle-endpoint" style={{left:`${clamp(value)}%`}}/></>}
 </div>;
}

function ClockDial({elapsed}:{elapsed:number|null}) {
 if(elapsed===null)return <div className="hu-cycle-no-clock" aria-hidden="true">—</div>;
 const hand=point(elapsed*3.6,25,48,48),end=point(elapsed*3.6,34,48,48);
 return <svg className="hu-cycle-dial" viewBox="0 0 96 96" aria-hidden="true" focusable="false" data-time-fill={elapsed}>
  <ScaleTicks start={0} span={360} radius={44} count={61} cx={48} cy={48}/>
  <circle className="hu-cycle-dial-base" cx="48" cy="48" r="34"/>
  <circle className="hu-cycle-dial-elapsed" cx="48" cy="48" r="34" pathLength="100" strokeDasharray={`${clamp(elapsed)} 100`} transform="rotate(-90 48 48)"/>
  <line className="hu-cycle-dial-hand" x1="48" y1="48" x2={hand.x} y2={hand.y}/>
  <circle className="hu-cycle-dial-pin" cx="48" cy="48" r="2"/>
  <circle className="hu-cycle-dial-pin" cx={end.x} cy={end.y} r="3"/>
 </svg>;
}
