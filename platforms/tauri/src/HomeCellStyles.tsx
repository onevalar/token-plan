import type {CSSProperties} from 'react';
import {isQuotaMetric} from './Metrics';
import {preciseQuotaReading} from './homeUsage';
import {providerText} from './providerText';
import {Amount,Cells,Expiries,MetricLabel,Meter,Reset,Status,Value,clamp,metricAttributes,type DesignProps} from './HomeQuotaParts';
import './home-cell-styles.css';

/** These fixed-denominator cells represent one quota, never individual requests or combined windows. */
export function HomeCellStyles(props:DesignProps) {
 const {variant,remaining,language}=props;
 const readings=props.metrics.map(metric=>({metric,r:isQuotaMetric(metric)?preciseQuotaReading({metric,...props}):null}));
 // Only two short quota readings fit the paired battery layout. Mixed metrics keep their original rows.
 const paired=readings.length===2&&readings.every(({r})=>r!==null&&r.name.length<=24&&r.valueText.length<=7);
 return <div className="hq-cell-styles" data-variant={variant}>
  <div className="hq-b-layout" data-paired={variant===2&&paired}>{readings.map(({metric,r})=>{
   if(r===null)return <Amount key={metric.id} metric={metric} {...props}/>;
   const label=<MetricLabel metric={metric} r={r} {...props}/>;
   if(variant===0)return <div className="hq-b-dot" key={metric.id} {...metricAttributes(metric,r)}>
    {label}<div className="hq-b-dot-body">
     <div className="hq-b-dot-reading"><Value r={r}/><span className="hq-b-mode">{r.mode}</span><Status r={r} missing={props.missing}/><Reset metric={metric} {...props}/></div>
     <Meter r={r} className="hq-b-dot-matrix">{r.value===null?<div className="hq-b-no-signal" aria-hidden="true">—</div>:<Cells value={r.value} count={100} columns={10} shape="round"/>}</Meter>
    </div><Expiries metric={metric} {...props}/>
   </div>;
   if(variant===1)return <div className="hq-b-grille" key={metric.id} {...metricAttributes(metric,r)}
    data-remaining={remaining??false} style={{'--hq-b-boundary':remaining?.2:.8} as CSSProperties}>
    <div className="hq-b-grille-heading">{label}<div className="hq-b-grille-reading"><Value r={r}/><span className="hq-b-mode">{r.mode}</span></div></div>
    <div className="hq-b-grille-scale">
     <Meter r={r} className="hq-b-grille-meter">{r.value===null?<div className="hq-b-no-signal" aria-hidden="true">—</div>:<Cells value={r.value} count={40} columns={40} shape="slash"/>}</Meter>
     <span className="hq-b-grille-boundary" aria-hidden="true"/>
     <div className="hq-b-grille-axis"><span aria-hidden="true">0%</span><span className="hq-b-boundary-label">{providerText(remaining?'20% Remaining Warning':'80% Used Warning',language)}</span><span aria-hidden="true">100%</span></div>
    </div>
    <div className="hq-b-grille-footer"><Status r={r} missing={props.missing}/><Reset metric={metric} {...props}/></div><Expiries metric={metric} {...props}/>
   </div>;
   return <div className="hq-b-battery" key={metric.id} {...metricAttributes(metric,r)}>
    <div className="hq-b-battery-label">{label}</div>
    <div className="hq-b-battery-reading"><Value r={r}/><span className="hq-b-mode">{r.mode}</span></div>
    <Meter r={r} className="hq-b-battery-meter"><Battery value={r.value}/></Meter>
    <div className="hq-b-battery-status"><Status r={r} missing={props.missing}/></div>
    <div className="hq-b-battery-reset"><Reset metric={metric} {...props}/></div><Expiries metric={metric} {...props}/>
   </div>;
  })}</div>
 </div>;
}

function Battery({value}:{value:number|null}) {
 return <svg viewBox="0 0 64 146" aria-hidden="true" focusable="false" data-unknown={value===null}>
  <rect className="hq-b-battery-terminal" x="24" y="3" width="16" height="6" rx="2"/>
  <rect className="hq-b-battery-shell" x="6" y="10" width="52" height="130" rx="8"/>
  {value===null?<path className="hq-b-battery-unknown" d="M24 75h16"/>:Array.from({length:10},(_,i)=>{
   const y=17+i*12,fraction=Math.max(0,Math.min(1,clamp(value)/10-(9-i)));
   return <g key={i} data-segment={9-i} data-fraction={fraction}>
    <rect className="hq-b-battery-track" x="12" y={y} width="40" height="8" rx="1.5"/>
    {fraction>0&&<rect className="hq-b-battery-fill" x="12" y={y+8*(1-fraction)} width="40" height={8*fraction} rx="1.5"/>}
   </g>;
  })}
 </svg>;
}
