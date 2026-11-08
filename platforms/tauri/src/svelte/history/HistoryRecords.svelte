<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {ChevronDown,ChevronLeft,ChevronRight} from '@lucide/svelte';
 import HistoryModelBreakdown from './HistoryModelBreakdown.svelte';
 import {summarizeHistory} from '../../historyModel';
 import {providerText} from '../../providerText';
 import type {StatisticsView} from '../../statisticsData';
 import type {Copy} from '../../copy';
 // HistoryPage owns these values so editing module preferences does not reset
 // the current records page or disclosure, matching the original page contract.
 let {rows,t,language,page=$bindable(0),expanded=$bindable(null),modelRow=$bindable(null)}:{rows:StatisticsView['rows'];t:Copy;language:string;page?:number;expanded?:string|null;modelRow?:string|null}=$props();
 const days=$derived([...new Set(rows.map(r=>r.date))]),pages=$derived(Math.max(1,Math.ceil(days.length/7))),current=$derived(Math.min(page,pages-1));
 const tr=(s:string)=>providerText(s,language);
 const money=(value:number|null)=>value==null?'—':new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
 const number=(value:number)=>new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(value);
</script>
{#if days.length}<section class="history-records"><h2>{tr('Daily Records')}</h2>
 {#each days.slice(current*7,current*7+7) as date (date)}{@const entries=rows.filter(r=>r.date===date)}{@const sum=summarizeHistory(entries)}
  <div class="day-record"><Button variant="ghost" class="row-button day-trigger" aria-expanded={expanded===date} onclick={()=>{expanded=expanded===date?null:date;modelRow=null;}}><span class="record-label">{new Date(`${date}T12:00:00`).toLocaleDateString(language,{month:'short',day:'numeric'})}<small>{number(sum.tokens)} token</small></span><span class="record-value">{money(sum.cost)}</span>{#if expanded===date}<ChevronDown size={16}/>{:else}<ChevronRight size={16}/>{/if}</Button>
   {#if expanded===date}<div class="day-entries">{#each entries as r (r.owner)}<div class="history-entry"><Button variant="ghost" size="sm" class="row-button entry-trigger" disabled={!r.models.length} aria-expanded={modelRow===r.owner} onclick={()=>modelRow=modelRow===r.owner?null:r.owner}><span class="record-label">{r.provider}{#if r.account}<small>{r.account}</small>{/if}</span><span class="record-value">{money(r.cost)}<small>{number(r.tokens)} token</small></span>{#if r.models.length}{#if modelRow===r.owner}<ChevronDown size={14}/>{:else}<ChevronRight size={14}/>{/if}{/if}</Button>{#if modelRow===r.owner}<HistoryModelBreakdown row={r} {language}/>{/if}</div>{/each}</div>{/if}
  </div>
 {/each}
 {#if pages>1}<div class="pagination"><Button size="sm" variant="ghost" disabled={!current} aria-label={tr('Previous Page')} onclick={()=>{page=current-1;expanded=null;}}><ChevronLeft size={16}/></Button><span>{current+1} / {pages}</span><Button size="sm" variant="ghost" disabled={current===pages-1} aria-label={tr('Next Page')} onclick={()=>{page=current+1;expanded=null;}}><ChevronRight size={16}/></Button></div>{/if}
</section>{:else}<p>{t.noHistory}</p>{/if}
