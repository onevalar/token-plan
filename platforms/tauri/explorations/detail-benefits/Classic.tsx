import {MetricRow} from '../../src/Metrics';
import {textFor} from '../../src/copy';
import {now} from '../usage-candidates/data';
import type {BenefitsProps} from './readout';

// Exact Balance and Benefits row structure from AccountDetail, with its real MetricRow.
export function Classic({metrics,missing}:BenefitsProps) {
 return <>{metrics.map(m=><div key={m.id} data-benefit={m.id}>
  <MetricRow metric={{...m,expiries:[]}} now={now} missing={missing} language="zh-Hans"/>
  {m.expiries.length>0&&<details className="expiry-details"><summary>{textFor('zh-Hans').expires} · {m.expiries.length}</summary><ul>{m.expiries.map((date,i)=><li key={i}>{new Date(date).toLocaleString('zh-Hans',{dateStyle:'medium',timeStyle:'short'})}</li>)}</ul></details>}
 </div>)}</>;
}
