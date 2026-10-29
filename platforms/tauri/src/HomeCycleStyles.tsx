import {useId} from 'react';
import type {Metric} from './desktop';
import {isQuotaMetric} from './Metrics';
import {quotaCycle,quotaPercent,preciseQuotaReading} from './homeUsage';
import {providerText} from './providerText';
import {Amount,Expiries,Meter,MetricLabel,Reset,ScaleTicks,Value,Status,point,clamp,metricAttributes,type Reading,type DesignProps} from './HomeQuotaParts';
import './home-cycle-styles.css';

type Cycle=ReturnType<typeof quotaCycle>;
type ChartProps={r:Reading;cycle:Cycle;language:string};

/** Quota and time are independent channels within one observed window, not averaged limits or a forecast. */
export function HomeCycleStyles({metrics,...props}:DesignProps) {
 return <div className="hq-cycles" data-variant={props.variant}>{metrics.map(metric=>isQuotaMetric(metric)?
  <CycleQuota key={metric.id} metric={metric} {...props}/>:<Amount key={metric.id} metric={metric} {...props}/>)}</div>;
}

function CycleQuota({metric,variant,...props}:Omit<DesignProps,'metrics'>&{metric:Metric}) {
 const r=preciseQuotaReading({metric,...props}),cycle=quotaCycle(metric,props.now),tr=(key:string)=>providerText(key,props.language);
 return <div className="hq-cycle-item" {...metricAttributes(metric,r)} data-cycle-elapsed={cycle.elapsed??'unknown'}>
  <div className="hq-cycle-heading"><MetricLabel metric={metric} r={r} {...props}/><Status r={r} missing={props.missing}/></div>
  {variant===0?<Racetrack r={r} cycle={cycle} language={props.language}/>:variant===1?<ParallelLanes r={r} cycle={cycle} language={props.language}/>:<div className="hq-cycle-clock-row">
   <figure className="hq-cycle-clock"><ClockDial elapsed={cycle.elapsed}/><figcaption><span>{tr('Cycle Elapsed')}</span><Elapsed cycle={cycle} language={props.language}/></figcaption></figure>
   <div className="hq-cycle-clock-reading"><span className="hq-cycle-mode">{r.mode}</span><Meter r={r}><Value r={r}/></Meter><Reset metric={metric} {...props}/></div>
  </div>}
  {variant!==2&&<div className="hq-cycle-reset"><Reset metric={metric} {...props}/></div>}
  {cycle.elapsed===null&&<p className="hq-cycle-unavailable">{tr('Cycle progress unavailable')}</p>}
  <Expiries metric={metric} {...props}/>
 </div>;
}

function Elapsed({cycle,language}:{cycle:Cycle;language:string}) {
 return <span className="hq-cycle-elapsed">{cycle.elapsed===null?'—':quotaPercent(Math.round(cycle.elapsed*10)/10,language)}</span>;
}

function Racetrack({r,cycle,language}:ChartProps) {
 const mask=useId(),tr=(key:string)=>providerText(key,language);
 return <>
  <div className="hq-cycle-racetrack">
   <Meter r={r}><svg viewBox="0 0 320 128" aria-hidden="true" focusable="false">
    <defs><mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="128">
     {cycle.elapsed!==null&&<rect x="18" y="18" width="284" height="92" rx="46" fill="none" stroke="white" strokeWidth="6" pathLength="100" strokeDasharray={`${clamp(cycle.elapsed)} 100`}/>}
    </mask></defs>
    <rect className="hq-cycle-race-base" x="6" y="6" width="308" height="116" rx="58" pathLength="100"/>
    {r.value!==null&&r.value>0&&<rect className="hq-cycle-race-quota" data-quota-fill={clamp(r.value)} x="6" y="6" width="308" height="116" rx="58" pathLength="100" strokeDasharray={`${clamp(r.value)} 100`}/>}
    <rect className="hq-cycle-race-time-base" x="18" y="18" width="284" height="92" rx="46" pathLength="100" strokeDasharray="1 1"/>
    {cycle.elapsed!==null&&<rect className="hq-cycle-race-time" data-time-fill={cycle.elapsed} x="18" y="18" width="284" height="92" rx="46" pathLength="100" strokeDasharray="1 1" mask={`url(#${mask})`}/>}
   </svg></Meter>
   <div className="hq-cycle-race-reading" aria-hidden="true"><Value r={r}/><span className="hq-cycle-mode"><i className="hq-cycle-key"/>{r.mode} · {tr('Outer Ring')}</span></div>
  </div>
  <div className="hq-cycle-race-legend"><span><i className="hq-cycle-key hq-cycle-key-time" aria-hidden="true"/>{tr('Cycle Elapsed')} · {tr('Inner Ring')}</span><Elapsed cycle={cycle} language={language}/></div>
 </>;
}

function ParallelLanes({r,cycle,language}:ChartProps) {
 return <div className="hq-cycle-lanes">
  <span className="hq-cycle-mode">{r.mode}</span><Meter r={r}><Lane value={r.value}/></Meter><Value r={r} small/>
  <span className="hq-cycle-mode">{providerText('Cycle Elapsed',language)}</span><Lane value={cycle.elapsed} time/><Elapsed cycle={cycle} language={language}/>
 </div>;
}

function Lane({value,time=false}:{value:number|null;time?:boolean}) {
 return <div className="hq-track hq-cycle-lane" data-channel={time?'time':'quota'} data-unknown={value===null} data-fill={value===null?'unknown':clamp(value)} aria-hidden="true">
  {value!==null&&<><span style={{transform:`scaleX(${clamp(value)/100})`}}/><i className="hq-cycle-endpoint" style={{left:`${clamp(value)}%`}}/></>}
 </div>;
}

function ClockDial({elapsed}:{elapsed:number|null}) {
 if(elapsed===null)return <div className="hq-cycle-no-clock" aria-hidden="true">—</div>;
 const hand=point(elapsed*3.6,25,48,48),end=point(elapsed*3.6,34,48,48);
 return <svg className="hq-cycle-dial" viewBox="0 0 96 96" aria-hidden="true" focusable="false" data-time-fill={elapsed}>
  <ScaleTicks start={0} span={360} radius={44} count={61} cx={48} cy={48}/>
  <circle className="hq-cycle-dial-base" cx="48" cy="48" r="34"/>
  <circle className="hq-cycle-dial-elapsed" cx="48" cy="48" r="34" pathLength="100" strokeDasharray={`${clamp(elapsed)} 100`} transform="rotate(-90 48 48)"/>
  <line className="hq-cycle-dial-hand" x1="48" y1="48" x2={hand.x} y2={hand.y}/>
  <circle className="hq-cycle-dial-pin" cx="48" cy="48" r="2"/><circle className="hq-cycle-dial-pin" cx={end.x} cy={end.y} r="3"/>
 </svg>;
}
