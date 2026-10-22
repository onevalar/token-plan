import {isQuotaMetric,MetricExpiries} from '../../src/Metrics';
import {Classic} from '../usage-candidates/variants/Classic';
import {reading,meterProps,type VariantProps} from '../usage-candidates/readout';
import {Reset} from './Reset';

// Arc Usage Meter's track + scaleX fill, adapted into equal percentage cells.
// A partial last cell preserves continuous proportion, not an invented count.
export function Segmented({metrics,remaining,missing}:VariantProps) {
 return <div className="segmented-quotas">{metrics.map(m=>{
  if(!isQuotaMetric(m))return <Classic key={m.id} metrics={[m]} remaining={remaining} missing={missing}/>;
  const r=reading(m,remaining);
  return <div className="segmented-quota" data-metric={m.id} data-tone={r.tone} key={m.id}>
   <div className="segmented-label"><span>{r.name}</span><Reset metric={m} missing={missing}/></div>
   <div className="segmented-reading">
    {r.value===null?<div className="segmented-unknown" aria-hidden="true"/>:<div className="segmented-meter" {...meterProps(m,remaining)}>
     <div className="segmented-track" aria-hidden="true">{Array.from({length:20},(_,i)=><span className="segmented-cell" key={i}><span className="segmented-fill" style={{transform:`scaleX(${Math.max(0,Math.min(1,r.value!/5-i))})`}}/></span>)}</div>
    </div>}
    <strong className="segmented-value" aria-hidden="true">{r.text}</strong>
   </div>
   {r.warning&&<p className="next-warning">{r.warning}</p>}
   <MetricExpiries metric={m} language="zh-Hans"/>
  </div>;
 })}</div>;
}
