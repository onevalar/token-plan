import {isQuotaMetric} from '../../../src/Metrics';
import {SmallArc} from '../arc-graphics';
import {Readout,reading,meterProps,type VariantProps} from '../readout';
import {Classic} from './Classic';

export function Compact({metrics,remaining,missing}:VariantProps) {
 return <div className="compact-quotas">{metrics.map(m=>{
  if(!isQuotaMetric(m))return <Classic key={m.id} metrics={[m]} remaining={remaining} missing={missing}/>;
  const r=reading(m,remaining);
  return <div key={m.id} className="compact-row"><div className="small-meter" {...meterProps(m,remaining)}><SmallArc value={r.value} tone={r.tone}/></div><Readout metric={m} remaining={remaining} missing={missing}/></div>;
 })}</div>;
}
