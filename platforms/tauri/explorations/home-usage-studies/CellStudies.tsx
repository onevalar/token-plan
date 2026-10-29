import type {CSSProperties} from 'react';
import {isQuotaMetric} from '../../src/Metrics';
import {clamp,metricAttributes,readQuota,type StudyProps} from './data';
import {Amount,Cells,Expiries,MetricLabel,Meter,Reset,Status,Value} from './Shared';
import './cell-studies.css';

/** Fixed-denominator shapes adapted from Usage Meter; segments never represent requests. */
export function CellStudies(props:StudyProps) {
 const {variant,now,remaining}=props;
 const readings=props.metrics.map(metric=>({metric,r:isQuotaMetric(metric)?readQuota(metric,props):null}));
 // Pair only two short, independent readings. Mixed metrics and long content keep their original rows.
 const paired=readings.length===2&&readings.every(({r})=>r!==null&&r.name.length<=24&&r.valueText.length<=7);
 return <div className="hu-cell-studies" data-variant={variant}>
  <div className="hu-b-layout" data-paired={variant===2&&paired}>{readings.map(({metric,r})=>{
   if(r===null)return <Amount key={metric.id} metric={metric} now={now} remaining={remaining} missing={props.missing}/>;
   const label=<MetricLabel metric={metric} r={r} selected={props.selected} onSelect={props.onSelect}/>;
   if(variant===0)return <div className="hu-b-dot" key={metric.id} {...metricAttributes(metric,r)}>
    {label}
    <div className="hu-b-dot-body">
     <div className="hu-b-dot-reading">
      <Value r={r}/><span className="hu-b-mode">{r.mode}</span><Status r={r}/><Reset metric={metric} now={now}/>
     </div>
     <Meter r={r} className="hu-b-dot-matrix">
      {r.value===null?<div className="hu-b-no-signal" aria-hidden="true">—</div>:<Cells value={r.value} count={100} columns={10} shape="round"/>}
     </Meter>
    </div>
    <Expiries metric={metric}/>
   </div>;
   if(variant===1)return <div className="hu-b-grille" key={metric.id} {...metricAttributes(metric,r)}
    data-remaining={remaining} style={{'--hu-b-boundary':remaining?.2:.8} as CSSProperties}>
    <div className="hu-b-grille-heading">{label}<div className="hu-b-grille-reading"><Value r={r}/><span className="hu-b-mode">{r.mode}</span></div></div>
    <div className="hu-b-grille-scale">
     <Meter r={r} className="hu-b-grille-meter">
      {r.value===null?<div className="hu-b-no-signal" aria-hidden="true">—</div>:<Cells value={r.value} count={40} columns={40} shape="slash"/>}
     </Meter>
     <span className="hu-b-grille-boundary" aria-hidden="true"/>
     <div className="hu-b-grille-axis">
      <span aria-hidden="true">0%</span><span className="hu-b-boundary-label">{remaining?'剩余 20% 警戒':'已用 80% 警戒'}</span><span aria-hidden="true">100%</span>
     </div>
    </div>
    <div className="hu-b-grille-footer"><Status r={r}/><Reset metric={metric} now={now}/></div>
    <Expiries metric={metric}/>
   </div>;
   return <div className="hu-b-battery" key={metric.id} {...metricAttributes(metric,r)}>
    <div className="hu-b-battery-label">{label}</div>
    <div className="hu-b-battery-reading"><Value r={r}/><span className="hu-b-mode">{r.mode}</span></div>
    <Meter r={r} className="hu-b-battery-meter"><Battery value={r.value}/></Meter>
    <div className="hu-b-battery-status"><Status r={r}/></div>
    <div className="hu-b-battery-reset"><Reset metric={metric} now={now}/></div>
    <Expiries metric={metric}/>
   </div>;
  })}</div>
 </div>;
}

function Battery({value}:{value:number|null}) {
 return <svg viewBox="0 0 64 146" aria-hidden="true" focusable="false" data-unknown={value===null}>
  <rect className="hu-b-battery-terminal" x="24" y="3" width="16" height="6" rx="2"/>
  <rect className="hu-b-battery-shell" x="6" y="10" width="52" height="130" rx="8"/>
  {value===null?<path className="hu-b-battery-unknown" d="M24 75h16"/>:Array.from({length:10},(_,i)=>{
   const y=17+i*12,fraction=Math.max(0,Math.min(1,clamp(value)/10-(9-i)));
   return <g key={i} data-segment={9-i} data-fraction={fraction}>
    <rect className="hu-b-battery-track" x="12" y={y} width="40" height="8" rx="1.5"/>
    {fraction>0&&<rect className="hu-b-battery-fill" x="12" y={y+8*(1-fraction)} width="40" height={8*fraction} rx="1.5"/>}
   </g>;
  })}
 </svg>;
}
