import {isQuotaMetric,MetricExpiries} from '../../src/Metrics';
import {Classic} from '../usage-candidates/variants/Classic';
import {reading,type VariantProps} from '../usage-candidates/readout';
import {Reset} from './Reset';

// Static quota adaptation of Arc's free Metric Card: label, headline, context.
// No animated counter, change chip or nested card. These are independent values.
export function Numbers({metrics,remaining,missing}:VariantProps) {
 return <div className="number-quotas">{metrics.map(m=>{
  if(!isQuotaMetric(m))return <div className="number-amount" key={m.id}><Classic metrics={[m]} remaining={remaining} missing={missing}/></div>;
  const r=reading(m,remaining);
  return <article className="number-quota" data-metric={m.id} data-tone={r.tone} key={m.id} aria-label={`${r.name} · ${r.mode}`}>
   <div className="number-label"><span>{r.name}</span><small>{r.mode}</small></div>
   <span className="candidate-sr">{r.value===null?missing:`${r.value}%`}</span>
   <p className="number-value" aria-hidden="true"><strong>{r.value===null?'—':Math.round(r.value)}</strong>{r.value!==null&&<span>%</span>}</p>
   <div className="number-reset"><Reset metric={m} missing={missing}/></div>
   {r.warning&&<p className="next-warning">{r.warning}</p>}
   <MetricExpiries metric={m} language="zh-Hans"/>
  </article>;
 })}</div>;
}
