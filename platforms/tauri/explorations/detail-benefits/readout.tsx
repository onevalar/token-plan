import type {Metric} from '../../src/desktop';
import {providerText} from '../../src/providerText';

export type BenefitsProps={metrics:Metric[];missing:string};
// Keep the same formatting and values[] precedence as the production MetricRow.
// This prototype does not add amounts, infer exchange rates, or allocate them to dates.
export function valuesFor(m:Metric) {
 if(!m.hasData)return [];
 const values=m.values.length?m.values:m.amount===null?[]:[{amount:m.amount,unit:m.unit,label:''}];
 return values.map(v=>({
  value:v.unit==='dollars'?`$${v.amount.toFixed(2)}`:v.unit==='yuan'?`¥${v.amount.toFixed(2)}`:new Intl.NumberFormat('zh-Hans',{notation:'compact',maximumFractionDigits:1}).format(v.amount),
  label:v.unit==='credits'&&(!v.label||v.label==='Credits')?'Credits':providerText(v.label,'zh-Hans'),
 }));
}
export function ExpiryList({metric:m}:{metric:Metric}) {
 return <div className="benefit-dates"><p>到期日期 · {m.expiries.length} 条记录</p><ul>{m.expiries.map((date,i)=><li key={i}><time dateTime={date}>{new Date(date).toLocaleString('zh-Hans',{dateStyle:'medium',timeStyle:'short'})}</time></li>)}</ul></div>;
}
