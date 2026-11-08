<script lang="ts">
 import {WaffleChart} from '@valar/svelte-ui/waffle-chart';
 import {Button} from '@valar/svelte-ui/button';
 import SourceList from './SourceList.svelte';
 import SectionTitle from './SectionTitle.svelte';
 import StatisticsSummary from './StatisticsSummary.svelte';
 import {statisticsCopy,valueOf,type StatisticsChartProps} from '../../statisticsData';
 import '../../preview/statistics-composition.css';
 let {view,measure,language,variant,selected,onSelect}:StatisticsChartProps=$props();
 let page=$state(0);
 const copy=$derived(statisticsCopy(language)),total=$derived(valueOf(view.total,measure));
 const pages=$derived(Math.ceil(view.sources.length/5)),current=$derived(Math.min(page,pages-1)),sources=$derived(view.sources.slice(current*5,current*5+5));
 const chosen=$derived(view.sources.find(item=>item.key===selected));
 function arc(radius:number,part:number){const at=(degree:number)=>`${150+radius*Math.sin(degree*Math.PI/180)},${145-radius*Math.cos(degree*Math.PI/180)}`;return `M${at(-135)}A${radius} ${radius} 0 ${part>2/3?1:0} 1 ${at(-135+part*270)}`;}
 const entries=$derived.by(()=>{let sum=0;return view.sources.map(source=>{const from=sum,value=valueOf(source,measure);sum+=value??0;return {source,value,from,to:sum};});});
 const choose=(key:string)=>onSelect(selected===key?null:key);
</script>
<div class={`tp-composition tp-composition-${variant}`}><p class="tp-inline-total"><span>{copy.metricLabel(measure)}</span><strong>{copy.format(total,measure)}</strong></p>
 {#if variant!==2&&total!==null&&total>0}<div class="tp-composition-key" aria-label={copy.tr('Source Shares')}>{#each view.sources as source (source.key)}<button type="button" aria-pressed={selected===source.key} onclick={()=>choose(source.key)} style={`--source-color:${source.color}`}><i aria-hidden="true"></i>{source.name}</button>{/each}</div>{/if}
 {#if total===null||total===0}<StatisticsSummary kind="no-values" {view} {measure} {language} unknown={total===null}/>
 {:else if variant===0}
  <div class="tp-orbits"><svg viewBox="0 0 300 275" role="group" aria-label={copy.tr('Each source track uses the same 0–100% scale.')}>{#each sources as source,index (source.key)}{@const radius=126-index*22}{@const value=valueOf(source,measure)}{@const fraction=(value??0)/total}
   <g role="button" tabindex="0" aria-label={`${source.name} · ${value===null?copy.tr('Unknown'):`${(fraction*100).toLocaleString(language,{maximumFractionDigits:1})}%`}`} aria-pressed={selected===source.key} data-dim={selected!==null&&selected!==source.key} onclick={()=>choose(source.key)} onkeydown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(source.key);}}}><path class="tp-orbit-track" d={arc(radius,1)} stroke-width={13} fill="none"/>{#if fraction>0}<path d={arc(radius,fraction)} stroke={source.color} stroke-width={13} fill="none"/>{/if}</g>
  {/each}</svg><div class="tp-orbit-center"><strong>{view.sources.length}</strong><span>{copy.tr('Sources')}</span></div><div class="tp-orbit-ends"><span>0%</span><span>100%</span></div></div>
  {#if pages>1}<div class="tp-orbit-pager"><Button size="sm" variant="ghost" disabled={current===0} onclick={()=>page=current-1}>{copy.tr('Previous Sources')}</Button><span>{current+1} / {pages}</span><Button size="sm" variant="ghost" disabled={current===pages-1} onclick={()=>page=current+1}>{copy.tr('Next Sources')}</Button></div>{/if}<p class="tp-caption">{sources.map(source=>source.name).join(' · ')}</p>
 {:else if variant===1}
  <div class="tp-waffle"><WaffleChart data={view.sources.map(item=>({key:item.key,value:valueOf(item,measure)??0,color:selected!==null&&selected!==item.key?`color-mix(in oklab, ${item.color} 22%, var(--surface))`:item.color}))} label={copy.tr('100 cells represent the recorded total. Exact values are listed below.')}/></div><div class="tp-waffle-readout"><span>{chosen?chosen.name:copy.tr('100 Cells, About 1% Each')}</span><strong>{chosen?(valueOf(chosen,measure)===null?copy.tr('Unknown'):`${(valueOf(chosen,measure)!/total*100).toLocaleString(language,{maximumFractionDigits:2})}%`):copy.tr('Source Shares')}</strong></div>
 {:else}
  <!-- The horizontal plot is focusable so native keyboard scrolling can reach every step. -->
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="tp-composition-waterfall" tabindex="0" role="region" aria-label={copy.tr('Additive Steps')}><div class="tp-step-grid" style={`--steps:${entries.length+1}`}>{#each entries as {source,value,from,to} (source.key)}<button type="button" aria-pressed={selected===source.key} aria-label={`${source.name} · ${copy.format(value,measure,false)}`} onclick={()=>choose(source.key)} style={`--source-color:${source.color}`}><span class="tp-step-plot" aria-hidden="true"><span class="tp-step-number" style={`bottom:${to/total*100}%`}>{value===null?'?':copy.format(value,measure)}</span>{#if value===null}<span class="tp-step-missing">?</span>{:else}<i class={value===0?'tp-step-zero':''} style={`bottom:${from/total*100}%;height:${value/total*100}%`}></i>{/if}<span class="tp-step-connector" style={`bottom:${to/total*100}%`}></span></span><span class="tp-step-label">{source.name}</span></button>{/each}<div class="tp-step-total"><span class="tp-step-plot" aria-hidden="true"><span class="tp-step-number" style="bottom:100%">{copy.format(total,measure)}</span><i style="height:100%"></i></span><span class="tp-step-label">{copy.tr('Total')}</span></div></div></div>
 {/if}
 <p class="tp-chart-note">{copy.tr(variant===0?'Each track is 0–100%. Compare the values, not arc lengths across different radii.':variant===1?'Whole cells are rounded to total 100. Small sources remain in the exact list.':'Each step adds a recorded contribution. Scroll horizontally to see every source.')}{measure==='cost'&&!view.costComplete?` ${copy.tr('Only known costs are divided into shares.')}`:''}</p>
 <SectionTitle>{copy.tr('Source Details')}</SectionTitle><SourceList {view} {measure} {language} {selected} {onSelect} bars={false}/>
</div>
