import {Clock3} from 'lucide-react';
import {isQuotaMetric} from './Metrics';
import {preciseQuotaReading,quotaPercent} from './homeUsage';
import {providerText} from './providerText';
import {Amount,Expiries,MetricLabel,Value,Status,Reset,Meter,Track,arcPath,clamp,metricAttributes,type DesignProps} from './HomeQuotaParts';
import './home-editorial-styles.css';

export function HomeEditorialStyles(props:DesignProps) {
 const {metrics,variant,remaining,language}=props,tr=(key:string)=>providerText(key,language),percent=(value:number)=>quotaPercent(value,language);
 return <div className="hq-editorial" data-variant={variant}>{metrics.map(metric=>{
  if(!isQuotaMetric(metric))return <Amount key={metric.id} metric={metric} {...props}/>;
  const r=preciseQuotaReading({metric,...props});
  if(variant===0)return <div key={metric.id} className="hq-ticket" {...metricAttributes(metric,r)}>
   <div className="hq-ticket-reading"><MetricLabel metric={metric} r={r} {...props}/><Value r={r}/><small>{r.mode}</small></div>
   <div className="hq-ticket-reset"><Clock3 size={16} aria-hidden="true"/><Reset metric={metric} {...props}/><Status r={r} missing={props.missing}/></div>
   <Meter r={r}><Track value={r.value}/></Meter><Expiries metric={metric} {...props}/>
  </div>;
  if(variant===1){
   const used=r.used,left=used===null?null:100-used;
   // This bottom track always encodes Used; the chosen display mode changes emphasis, not its direction or ARIA range.
   const description=used===null?props.missing:[`${tr('Used')} ${percent(used)}`,`${tr('Remaining')} ${percent(left!)}`,r.warning].filter(Boolean).join(' · ');
   return <div key={metric.id} className="hq-spread" {...metricAttributes(metric,r)}>
    <div className="hq-spread-heading"><MetricLabel metric={metric} r={r} {...props}/><Status r={r} missing={props.missing}/></div>
    <div className="hq-spread-values">
     <div data-emphasized={!remaining}><span>{tr('Used')}</span>{!remaining?<Value r={r}/>:<span className="hq-secondary-value" data-side="used">{used===null?'—':percent(used)}</span>}</div>
     <span className="hq-spread-divider" aria-hidden="true">/</span>
     <div data-emphasized={remaining??false}><span>{tr('Remaining')}</span>{remaining?<Value r={r}/>:<span className="hq-secondary-value" data-side="remaining">{left===null?'—':percent(left)}</span>}</div>
    </div>
    <Meter r={{...r,value:used,label:`${r.name} · ${tr('Used')}`,description}}>
     <div className="hq-spread-track" data-unknown={used===null} aria-hidden="true">{used!==null&&<span style={{transform:`scaleX(${clamp(used)/100})`}}/>}</div>
    </Meter><Reset metric={metric} {...props}/><Expiries metric={metric} {...props}/>
   </div>;
  }
  return <div key={metric.id} className="hq-spine" {...metricAttributes(metric,r)}>
   <div className="hq-spine-words"><MetricLabel metric={metric} r={r} {...props}/><Reset metric={metric} {...props}/><Status r={r} missing={props.missing}/></div>
   <div className="hq-spine-value"><Value r={r}/><small>{r.mode}</small></div>
   <Meter r={r}><svg viewBox="0 0 56 70" aria-hidden="true" focusable="false">
    <path d={arcPath(-145,145,23,28,32)} className="hq-chart-track" strokeWidth="2"/>
    {r.value!==null&&clamp(r.value)>0&&<path d={arcPath(-145,-145+290*clamp(r.value)/100,23,28,32)} className="hq-chart-fill" strokeWidth="2"/>}
    <line x1="28" x2="28" y1="12" y2="52" className="hq-spine-axis"/><line x1="24" x2="32" y1="32" y2="32" className="hq-spine-axis"/>
   </svg></Meter><Expiries metric={metric} {...props}/>
  </div>;
 })}</div>;
}
