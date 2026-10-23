import {StaticDonut,type DonutPart} from '../components/arc/static-donut/static-donut';
import {providerText} from '../providerText';
import type {Account} from '../desktop';
import './history-model-breakdown.css';

type HistoryRecord=Account['history'][number];
type ModelRecord=HistoryRecord['models'][number];
type Props={row:Pick<HistoryRecord,'tokens'|'models'>;language:string};
type Readings={tr:(text:string)=>string;exact:(value:number)=>string;cost:(value:number|null)=>string};

function composition(row:Props['row']) {
 const total=row.tokens,sum=row.models.reduce((value,model)=>value+model.tokens,0);
 let reason='';
 if(!Number.isFinite(total)||total<0)reason='Recorded token counts are invalid. Showing the original model list.';
 else if(row.models.some(m=>!Number.isFinite(m.tokens)||m.tokens<0)||!Number.isFinite(sum))reason='Model token counts are invalid. Showing the original model list.';
 else if(sum>total)reason='Model tokens exceed the recorded total. Showing the original model list.';
 const remainder=reason?0:total-sum;
 if(!reason&&total===0)reason='No positive recorded tokens to compare. Showing the original model list.';
 else if(!reason&&sum===0)reason='No positive model tokens to compare. Showing the original model list.';
 if(!reason&&row.models.filter(m=>m.tokens>0).length+(remainder>0?1:0)>6)reason='More than six nonzero parts. Showing the original model list.';
 return {total,remainder,reason};
}

function Variants({model,readings}:{model:ModelRecord;readings:Readings}) {
 const {tr,exact,cost}=readings;
 return model.variants.length>0?<details className="history-model-variants"><summary>{tr('Model Breakdown')} · {exact(model.variants.length)}</summary>
  <p>{tr('These variants are included in the model above, not added again.')}</p>
  {model.variants.map((v,i)=><div key={`${i}:${v.model}`}><span>{v.model}</span><span>{exact(v.tokens)} {tr('tokens')} · {cost(v.cost)}</span></div>)}
 </details>:null;
}

function OriginalModels({row,language,readings}:Props&{readings:Readings}) {
 const {tr,exact,cost}=readings;
 // Keep the original compact rows, with exact readings available underneath.
 const money=(value:number|null)=>value==null?'—':new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
 const number=(value:number)=>new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(value);
 return <>
  {row.models.map((m,i)=><div className="model-record" key={`${i}:${m.model}`}><span>{tr(m.model)}</span><span>{money(m.cost)}<small>{number(m.tokens)} token</small></span>{m.variants.length>0&&<details><summary>{tr('Model Breakdown')}</summary>{m.variants.map((v,j)=><p key={`${j}:${v.model}`}>{v.model} · {number(v.tokens)} token · {money(v.cost)}</p>)}</details>}</div>)}
  <details className="history-model-exact"><summary>{tr('Exact Readings')} · {exact(row.models.length)}</summary>
   {row.models.map((m,i)=><div className="history-model-exact-row" key={`${i}:${m.model}`}><span>{tr(m.model)}</span><span>{exact(m.tokens)} {tr('tokens')} · {cost(m.cost)}</span><Variants model={m} readings={readings}/></div>)}
  </details>
 </>;
}

/** One already-deduplicated day/source row is the denominator, not an account's
 * complete usage or bill. Variants subdivide their model and are never summed. */
export function HistoryModelBreakdown({row,language}:Props) {
 const tr=(text:string)=>providerText(text,language);
 const exactFormatter=new Intl.NumberFormat(language,{maximumFractionDigits:20});
 const costFormatter=new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',minimumFractionDigits:2,maximumFractionDigits:2});
 const percentFormatter=new Intl.NumberFormat(language,{style:'percent',maximumFractionDigits:2});
 const exact=(value:number)=>exactFormatter.format(value),cost=(value:number|null)=>value==null?tr('Cost Unknown'):costFormatter.format(value);
 const readings={tr,exact,cost},info=composition(row);
 if(info.reason)return <div className="history-model-breakdown history-model-fallback">
  <p className="history-model-notice">{tr(info.reason)}</p>
  {info.remainder>0&&<p className="history-model-caption">{tr('Unclassified Records')}: {exact(info.remainder)} {tr('tokens')} · {tr('Cost Unknown')}</p>}
  <OriginalModels row={row} language={language} readings={readings}/>
 </div>;
 const share=(value:number)=>{
  const fraction=value/info.total;
  if(fraction>0&&fraction<.0001)return `<${percentFormatter.format(.0001)}`;
  if(fraction<1&&fraction>.9999)return `>${percentFormatter.format(.9999)}`;
  return percentFormatter.format(fraction);
 };
 const parts:DonutPart[]=row.models.map((model,index)=>({model,index})).filter(({model})=>model.tokens>0).map(({model,index},i)=>({key:`model:${index}`,value:model.tokens,color:i<4?`var(--series-${i+1})`:i===4?'var(--text-secondary)':'var(--text-muted)'}));
 if(info.remainder>0)parts.push({key:'unclassified',value:info.remainder,color:'var(--text-muted)'});
 return <div className="history-model-breakdown history-model-composition" data-denominator={info.total}>
  <h3>{tr('Share of Recorded Tokens')}</h3>
  <p className="history-model-denominator">{tr('Shares use %@ recorded tokens from this day and source, not a plan limit or a full bill.').replace('%@',exact(info.total))}</p>
  <figure className="history-model-donut" aria-label={tr('Share of Recorded Tokens')}>
   <StaticDonut parts={parts} total={info.total}/>
   <div className="history-model-donut-center"><span>{tr('Recorded Tokens')}</span><strong>{exact(info.total)}</strong></div>
  </figure>
  {info.remainder>0&&<p className="history-model-caption">{tr('Tokens without a model stay in the total as unclassified records.')}</p>}
  <ol className="history-model-legend" role="list">{row.models.map((m,i)=>{
   const part=parts.find(p=>p.key===`model:${i}`);
   return <li key={`${i}:${m.model}`}><div className="history-model-legend-head"><span className="history-model-swatch" style={{background:part?.color??'transparent'}} aria-hidden="true"/><span>{tr(m.model)}</span><strong>{share(m.tokens)}</strong></div>
    <div className="history-model-legend-values"><span>{exact(m.tokens)} {tr('tokens')}</span><span>{cost(m.cost)}</span></div><Variants model={m} readings={readings}/>
   </li>;
  })}{info.remainder>0&&<li className="history-model-unclassified"><div className="history-model-legend-head"><span className="history-model-swatch" style={{background:'var(--text-muted)'}} aria-hidden="true"/><span>{tr('Unclassified Records')}</span><strong>{share(info.remainder)}</strong></div><div className="history-model-legend-values"><span>{exact(info.remainder)} {tr('tokens')}</span><span>{tr('Cost Unknown')}</span></div></li>}</ol>
 </div>;
}
