import {MetricRow,metricName,metricAmount,type MetricRowProps} from '../Metrics';
import {ExpandableCard} from '../components/arc/expandable-card/expandable-card';
import {textFor} from '../copy';
import type {Metric} from '../desktop';
import './benefit-metrics.css';

type BenefitMetricsProps=Omit<MetricRowProps,'metric'> & {metrics:Metric[]};

export function BenefitMetrics({metrics,language,missing,now,remaining}:BenefitMetricsProps) {
 return <div className="benefit-expandables">{metrics.map(m=>{
  if(!m.expiries.length)return <MetricRow key={m.id} metric={m} now={now} missing={missing} language={language} remaining={remaining}/>;
  return <ExpandableCard key={m.id} data-benefit={m.id} title={`${metricName(m,language)} · ${metricAmount(m,language,missing)}`}>
   <div className="benefit-dates"><p>{textFor(language).expires} · {m.expiries.length}</p><ul>{m.expiries.map((date,i)=><li key={i}><time dateTime={date}>{new Date(date).toLocaleString(language,{dateStyle:'medium',timeStyle:'short'})}</time></li>)}</ul></div>
  </ExpandableCard>;
 })}</div>;
}
