import {isQuotaMetric,MetricReset,MetricExpiries} from '../../../src/Metrics';
import {QuotaRuler} from '../arc-graphics';
import {reading,meterProps,type VariantProps} from '../readout';
import {now} from '../data';
import {Classic} from './Classic';

export function Ruler({metrics,remaining,missing}:VariantProps) {
 return <div className="ruler-quotas">{metrics.map(m=>{
  if(!isQuotaMetric(m))return <Classic key={m.id} metrics={[m]} remaining={remaining} missing={missing}/>;
  const r=reading(m,remaining);
  return <div key={m.id} className="ruler-row candidate-readout" data-metric={m.id} data-tone={r.tone}>
   <div className="ruler-heading"><span>{r.name}</span><strong>{r.text}</strong><MetricReset metric={m} now={now} missing={missing} language="zh-Hans"/></div>
   {r.value===null?<div className="ruler-unknown" aria-hidden="true"/>:<div {...meterProps(m,remaining)}><QuotaRuler value={r.value} remaining={remaining}/></div>}
   {r.warning&&<p className="ruler-note candidate-warning">{r.warning}</p>}
   <MetricExpiries metric={m} language="zh-Hans"/>
  </div>;
 })}</div>;
}
