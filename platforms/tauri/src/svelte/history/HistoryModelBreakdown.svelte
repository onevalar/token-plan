<script lang="ts">
 import {StaticDonut,type DonutPart} from '@valar/svelte-ui/donut-chart';
 import {providerText} from '../../providerText';
 import type {Account} from '../../desktop';
 import '../../preview/history-model-breakdown.css';
 type ModelRecord=Account['history'][number]['models'][number];
 let {row,language}:{row:Pick<Account['history'][number],'tokens'|'models'>;language:string}=$props();
 const tr=(text:string)=>providerText(text,language);
 const exact=(value:number)=>new Intl.NumberFormat(language,{maximumFractionDigits:20}).format(value);
 const cost=(value:number|null)=>value==null?tr('Cost Unknown'):new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
 const money=(value:number|null)=>value==null?'—':new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
 const number=(value:number)=>new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(value);
 const info=$derived.by(()=>{
  const total=row.tokens,sum=row.models.reduce((value,model)=>value+model.tokens,0);let reason='';
  if(!Number.isFinite(total)||total<0)reason='Recorded token counts are invalid. Showing the original model list.';
  else if(row.models.some(m=>!Number.isFinite(m.tokens)||m.tokens<0)||!Number.isFinite(sum))reason='Model token counts are invalid. Showing the original model list.';
  else if(sum>total)reason='Model tokens exceed the recorded total. Showing the original model list.';
  const remainder=reason?0:total-sum;
  if(!reason&&total===0)reason='No positive recorded tokens to compare. Showing the original model list.';
  else if(!reason&&sum===0)reason='No positive model tokens to compare. Showing the original model list.';
  if(!reason&&row.models.filter(m=>m.tokens>0).length+(remainder>0?1:0)>6)reason='More than six nonzero parts. Showing the original model list.';
  return {total,remainder,reason};
 });
 const parts=$derived.by(()=>{
  const result:DonutPart[]=row.models.map((model,index)=>({model,index})).filter(({model})=>model.tokens>0).map(({model,index},i)=>({key:`model:${index}`,value:model.tokens,color:i<4?`var(--series-${i+1})`:i===4?'var(--text-secondary)':'var(--text-muted)'}));
  if(info.remainder>0)result.push({key:'unclassified',value:info.remainder,color:'var(--text-muted)'});return result;
 });
 function share(value:number){const fraction=value/info.total,format=(n:number)=>new Intl.NumberFormat(language,{style:'percent',maximumFractionDigits:2}).format(n);return fraction>0&&fraction<.0001?`<${format(.0001)}`:fraction<1&&fraction>.9999?`>${format(.9999)}`:format(fraction);}
</script>
{#snippet variants(model:ModelRecord)}
 {#if model.variants.length}<details class="history-model-variants"><summary>{tr('Model Breakdown')} · {exact(model.variants.length)}</summary><p>{tr('These variants are included in the model above, not added again.')}</p>{#each model.variants as v,i (`${i}:${v.model}`)}<div><span>{v.model}</span><span>{exact(v.tokens)} {tr('tokens')} · {cost(v.cost)}</span></div>{/each}</details>{/if}
{/snippet}
{#if info.reason}<div class="history-model-breakdown history-model-fallback"><p class="history-model-notice">{tr(info.reason)}</p>{#if info.remainder>0}<p class="history-model-caption">{tr('Unclassified Records')}: {exact(info.remainder)} {tr('tokens')} · {tr('Cost Unknown')}</p>{/if}
 {#each row.models as m,i (`${i}:${m.model}`)}<div class="model-record"><span>{tr(m.model)}</span><span>{money(m.cost)}<small>{number(m.tokens)} token</small></span>{#if m.variants.length}<details><summary>{tr('Model Breakdown')}</summary>{#each m.variants as v,j (`${j}:${v.model}`)}<p>{v.model} · {number(v.tokens)} token · {money(v.cost)}</p>{/each}</details>{/if}</div>{/each}
 <details class="history-model-exact"><summary>{tr('Exact Readings')} · {exact(row.models.length)}</summary>{#each row.models as m,i (`${i}:${m.model}`)}<div class="history-model-exact-row"><span>{tr(m.model)}</span><span>{exact(m.tokens)} {tr('tokens')} · {cost(m.cost)}</span>{@render variants(m)}</div>{/each}</details>
</div>{:else}<div class="history-model-breakdown history-model-composition" data-denominator={info.total}>
 <h3>{tr('Share of Recorded Tokens')}</h3><p class="history-model-denominator">{tr('Shares use %@ recorded tokens from this day and source, not a plan limit or a full bill.').replace('%@',exact(info.total))}</p>
 <figure class="history-model-donut" aria-label={tr('Share of Recorded Tokens')}><StaticDonut {parts} total={info.total}/><div class="history-model-donut-center"><span>{tr('Recorded Tokens')}</span><strong>{exact(info.total)}</strong></div></figure>
 {#if info.remainder>0}<p class="history-model-caption">{tr('Tokens without a model stay in the total as unclassified records.')}</p>{/if}
 <ol class="history-model-legend" role="list">{#each row.models as m,i (`${i}:${m.model}`)}{@const part=parts.find(p=>p.key===`model:${i}`)}<li><div class="history-model-legend-head"><span class="history-model-swatch" style={`background:${part?.color??'transparent'}`} aria-hidden="true"></span><span>{tr(m.model)}</span><strong>{share(m.tokens)}</strong></div><div class="history-model-legend-values"><span>{exact(m.tokens)} {tr('tokens')}</span><span>{cost(m.cost)}</span></div>{@render variants(m)}</li>{/each}
  {#if info.remainder>0}<li class="history-model-unclassified"><div class="history-model-legend-head"><span class="history-model-swatch" style="background:var(--text-muted)" aria-hidden="true"></span><span>{tr('Unclassified Records')}</span><strong>{share(info.remainder)}</strong></div><div class="history-model-legend-values"><span>{exact(info.remainder)} {tr('tokens')}</span><span>{tr('Cost Unknown')}</span></div></li>{/if}
 </ol>
</div>{/if}
