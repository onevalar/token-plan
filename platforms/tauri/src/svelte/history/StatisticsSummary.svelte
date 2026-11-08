<script lang="ts">
 import {Info} from '@lucide/svelte';
 import {statisticsCopy,valueOf,canCompare,type StatisticsView,type StatisticsMeasure} from '../../statisticsData';
 let {kind='hero',view,measure='tokens',language,small=false,comparison=true,unknown=false,day=null}:{
  kind?:'hero'|'comparison'|'simple'|'strip'|'coverage'|'no-values'|'day';view:StatisticsView;measure?:StatisticsMeasure;
  language:string;small?:boolean;comparison?:boolean;unknown?:boolean;day?:string|null;
 }=$props();
 const copy=$derived(statisticsCopy(language));
 const current=$derived(valueOf(view.total,measure)),prior=$derived(valueOf(view.previous,measure));
 const comparable=$derived(canCompare(view,measure)&&current!==null&&prior!==null);
 const partial=$derived(view.partial||measure==='cost'&&!view.costComplete);
 const selected=$derived(view.days.find(item=>item.date===day)??view.days.at(-1)!);
</script>
{#snippet comparisonNote()}
 <p class="tp-comparison">{#if comparable&&current!==null&&prior!==null}<span>{copy.signed(current-prior,measure)}</span>{' '}{copy.tr('Compared With the Previous Equal Period')}{#if prior>0}{` (${current>=prior?'+':'−'}${(Math.abs(current-prior)/prior*100).toLocaleString(language,{maximumFractionDigits:1})}%)`}{:else if prior===0&&current>0}{` · ${copy.tr('Previous total is zero; no growth rate is calculated.')}`}{/if}{:else}{copy.tr('Incomplete records. No increase or decrease is inferred.')}{/if}</p>
{/snippet}
{#if kind==='hero'}
 <div class={`tp-hero${small?' tp-hero-small':''}`}><span class="tp-caption">{copy.metricLabel(measure)}{partial?` · ${copy.tr('Recorded Portion Only')}`:''}</span><div class="tp-hero-number" data-testid="hero-total" data-value={current??'unknown'}>{copy.format(current,measure)}<small>{copy.unit(measure)}</small></div>{#if comparison}{@render comparisonNote()}{/if}</div>
{:else if kind==='comparison'}{@render comparisonNote()}
{:else if kind==='simple'}
 <dl class="history-totals">{#each ['cost','tokens'] as metric}{@const m=metric as StatisticsMeasure}<div><dt>{copy.tr(m==='cost'?'Known Cost':'Recorded Tokens')}</dt><dd data-statistics-total={m}>{copy.format(valueOf(view.total,m),m)}</dd></div>{/each}</dl>
{:else if kind==='strip'}
 <dl class="tp-stat-strip"><div><dt>{copy.tr('Known Cost')}</dt><dd>{copy.format(view.total.cost,'cost')}<small>USD{!view.costComplete?` · ${copy.tr('Recorded Portion Only')}`:''}</small></dd></div><div><dt>{copy.tr('Active Days')}</dt><dd>{view.active}<small>/ {view.length}</small></dd></div><div><dt>{copy.tr('Recorded Days')}</dt><dd>{view.covered}<small>/ {view.length}</small></dd></div></dl>
{:else if kind==='coverage'}
 <div class="tp-coverage"><Info size={14} aria-hidden="true"/><p>{copy.tr('%@ of %@ days recorded; %@ of %@ costs known.',view.covered,view.length,view.total.knownCosts,view.total.records)} {copy.tr('Local records only. Missing data is not zero usage or free usage.')}{#if view.partial}{' '}{copy.tr('Some sources or dates are incomplete.')}{/if}</p></div>
{:else if kind==='no-values'}
 <div class="tp-no-values"><span class="tp-dash">{unknown?'?':'0'}</span><h3>{copy.tr(unknown?(measure==='cost'?'Cost Not Recorded':'No Recorded Data'):'Recorded Zero')}</h3><p>{copy.tr(unknown?'Unknown values are not treated as zero.':'No positive values to divide into shares.')}</p></div>
{:else if kind==='day'}
 <div class="tp-day-readout" data-testid="day-readout"><div><span>{selected.date}</span><strong>{selected.records?copy.format(valueOf(selected,measure),measure,false):copy.tr('No Recorded Data')}<small>{selected.records&&measure==='tokens'?' tokens':''}</small></strong></div><p class="tp-caption">{!selected.records?copy.tr('A missing day is unknown, not zero.'):selected.incomplete||selected.partial&&measure==='cost'?copy.tr('Recorded portion only. Missing values are not counted as zero.'):copy.tr('%@ account or device records.',selected.records)}</p></div>
{/if}
