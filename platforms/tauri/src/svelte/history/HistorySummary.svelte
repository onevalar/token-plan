<script lang="ts">
 import HistoryRanges from './HistoryRanges.svelte';
 import HistoryFallback from './HistoryFallback.svelte';
 import {providerText} from '../../providerText';
 import {historyRange,historyBounds,summarizeHistory,dateKey} from '../../historyModel';
 import type {Account} from '../../desktop';
 import type {Copy} from '../../copy';
 let {accounts,t,language,range,onRange,showTrend=true}:{accounts:Account[];t:Copy;language:string;range:string;onRange:(range:string)=>void;showTrend?:boolean}=$props();
 const rows=$derived(historyRange(accounts,'all',range)),total=$derived(summarizeHistory(rows)),bounds=$derived(historyBounds(range));
 const days=$derived(Array.from({length:range==='yesterday'?1:Number(range)},(_,i)=>{
  const d=new Date(`${bounds.start}T12:00:00`);d.setDate(d.getDate()+i);
  const key=dateKey(d),entries=rows.filter(r=>r.date===key);return {key,tokens:entries.length?summarizeHistory(entries).tokens:null};
 }));
 const maximum=$derived(Math.max(1,...days.map(d=>d.tokens??0)));
 const money=(value:number|null)=>value==null?'—':new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
</script>
<div class="usage-summary"><HistoryRanges {range} {onRange} {language}/>
 {#if rows.length}<dl class="history-totals"><div><dt>{accounts.some(a=>['openai','anthropic'].includes(a.family))?providerText('Known Cost',language):t.cost}</dt><dd>{money(total.cost)}</dd></div><div><dt>{t.tokens}</dt><dd>{new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(total.tokens)}</dd></div></dl>
  {#if showTrend&&(range==='30'||range==='7')}<div class="daily-trend"><div class="trend-bars" role="img" aria-label={providerText('Daily Token Usage',language)}>{#each days as d (d.key)}<span data-missing={d.tokens==null} style={`height:${d.tokens==null?'0':`${d.tokens/maximum*100}%`}`}></span>{/each}</div><div class="trend-caption"><span>{providerText('Daily Token Usage',language)}</span><span>{bounds.start.slice(5)} — {bounds.end.slice(5)}</span></div></div>{/if}
 {:else}<HistoryFallback {accounts} {t} {language} {range}/>{/if}
 {#if accounts.some(a=>a.historyPartial)||rows.some(r=>r.cost==null)&&total.cost!=null}<p class="notice" role="status">{t.historyWarning}</p>{/if}
</div>
