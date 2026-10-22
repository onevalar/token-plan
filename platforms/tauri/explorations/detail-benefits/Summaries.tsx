import {metricName} from '../../src/Metrics';
import {ExpiryList,valuesFor,type BenefitsProps} from './readout';

// Static adaptation of the inspected free Arc Metric Card's label/value/context structure.
// One surface per metric, not per value: dollars and credits are not interchangeable.
export function Summaries({metrics,missing}:BenefitsProps) {
 return <div className="benefit-summaries">{metrics.map(m=>{
  const values=valuesFor(m);
  return <article className="benefit-summary" key={m.id} data-benefit={m.id} aria-label={metricName(m,'zh-Hans')}>
   <h3>{metricName(m,'zh-Hans')}</h3>
   <div className="benefit-values">{values.length?values.map((v,i)=><p key={i}><strong>{v.value}</strong>{v.label&&<span>{v.label}</span>}</p>):<p className="benefit-missing">{missing}</p>}</div>
   {m.expiries.length>0&&<ExpiryList metric={m}/>}
  </article>;
 })}</div>;
}
