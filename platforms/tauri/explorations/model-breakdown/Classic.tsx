import {providerText} from '../../src/providerText';
import {ExactReadings} from './Readings';
import type {Fixture} from './data';

// Verbatim model-record JSX and formatters from src/preview/HistoryPage.tsx.
// The internal block is not exported. No production export or full-page hiding.
const money=(value:number|null,language:string)=>value==null?'—':new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
const number=(value:number,language:string)=>new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(value);
export function Classic({fixture}:{fixture:Fixture}) {
 const r=fixture.row,language='zh-Hans',tr=(s:string)=>providerText(s,language);
 return <div className="mb-classic">
  <p className="mb-caption">现有紧凑列表。— 表示费用未知，不是零费用。</p>
  {r.models.map(m=><div className="model-record" key={m.model}><span>{tr(m.model)}</span><span>{money(m.cost,language)}<small>{number(m.tokens,language)} token</small></span>{m.variants.length>0&&<details><summary>{tr('Model Breakdown')}</summary>{m.variants.map(v=><p key={v.model}>{v.model} · {number(v.tokens,language)} token · {money(v.cost,language)}</p>)}</details>}</div>)}
  <ExactReadings fixture={fixture}/>
 </div>;
}
