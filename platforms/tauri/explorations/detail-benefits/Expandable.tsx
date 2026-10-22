import {metricName} from '../../src/Metrics';
import {ExpandableCard} from './arc/expandable-card';
import {Classic} from './Classic';
import {ExpiryList,valuesFor,type BenefitsProps} from './readout';

export function Expandable({metrics,missing}:BenefitsProps) {
 return <div className="benefit-expandables">{metrics.map(m=>{
  if(!m.expiries.length)return <Classic key={m.id} metrics={[m]} missing={missing}/>;
  const values=valuesFor(m),value=values.length?values.map(v=>[v.value,v.label].filter(Boolean).join(' ')).join(' · '):missing;
  return <ExpandableCard key={m.id} data-benefit={m.id} title={`${metricName(m,'zh-Hans')} · ${value}`}>
   <ExpiryList metric={m}/>
  </ExpandableCard>;
 })}</div>;
}
