import {Clock3} from 'lucide-react';
import {isQuotaMetric} from '../../src/Metrics';
import {readQuota,clamp,percent,metricAttributes,type StudyProps} from './data';
import {Amount,Expiries,MetricLabel,Value,Status,Reset,Meter,Track,arcPath} from './Shared';
import './editorial-studies.css';

export function EditorialStudies(props:StudyProps) {
 const {metrics,variant,now,remaining}=props;
 return <div className="hu-editorial" data-variant={variant}>{metrics.map(metric=>{
  if(!isQuotaMetric(metric))return <Amount key={metric.id} metric={metric} {...props}/>;
  const r=readQuota(metric,props);
  if(variant===0)return <div key={metric.id} className="hu-ticket" {...metricAttributes(metric,r)}>
   <div className="hu-ticket-reading"><MetricLabel metric={metric} r={r} {...props}/><Value r={r}/><small>{r.mode}</small></div>
   <div className="hu-ticket-reset"><Clock3 size={16} aria-hidden="true"/><Reset metric={metric} now={now}/><Status r={r}/></div>
   <Meter r={r}><Track value={r.value}/></Meter><Expiries metric={metric}/>
  </div>;
  if(variant===1){
   const used=r.used,left=used===null?null:100-used;
   return <div key={metric.id} className="hu-spread" {...metricAttributes(metric,r)}>
    <div className="hu-spread-heading"><MetricLabel metric={metric} r={r} {...props}/><Status r={r}/></div>
    <div className="hu-spread-values">
     <div data-emphasized={!remaining}><span>已用</span>{!remaining?<Value r={r}/>:<span className="hu-secondary-value" data-side="used">{used===null?'—':percent(used)}</span>}</div>
     <span className="hu-spread-divider" aria-hidden="true">/</span>
     <div data-emphasized={remaining}><span>剩余</span>{remaining?<Value r={r}/>:<span className="hu-secondary-value" data-side="remaining">{left===null?'—':percent(left)}</span>}</div>
    </div>
    <Meter r={{...r,description:used===null?props.missing:`已用 ${percent(used)}，剩余 ${percent(left!)}${r.warning?`，${r.warning}`:''}`}}>
     <div className="hu-spread-track" data-unknown={used===null} aria-hidden="true">{used!==null&&<span style={{transform:`scaleX(${clamp(used)/100})`}}/>}</div>
    </Meter><Reset metric={metric} now={now}/><Expiries metric={metric}/>
   </div>;
  }
  return <div key={metric.id} className="hu-spine" {...metricAttributes(metric,r)}>
   <div className="hu-spine-words"><MetricLabel metric={metric} r={r} {...props}/><Reset metric={metric} now={now}/><Status r={r}/></div>
   <div className="hu-spine-value"><Value r={r}/><small>{r.mode}</small></div>
   <Meter r={r}><svg viewBox="0 0 56 70" aria-hidden="true" focusable="false">
    <path d={arcPath(-145,145,23,28,32)} className="hu-chart-track" strokeWidth="2"/>
    {r.value!==null&&clamp(r.value)>0&&<path d={arcPath(-145,-145+290*clamp(r.value)/100,23,28,32)} className="hu-chart-fill" strokeWidth="2"/>}
    <line x1="28" x2="28" y1="12" y2="52" className="hu-spine-axis"/><line x1="24" x2="32" y1="32" y2="32" className="hu-spine-axis"/>
   </svg></Meter><Expiries metric={metric}/>
  </div>;
 })}</div>;
}
