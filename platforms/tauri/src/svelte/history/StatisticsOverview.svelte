<script lang="ts">
 import {Gauge} from '@valar/svelte-ui/gauge';
 import {StaticSparkline} from '@valar/svelte-ui/sparkline';
 import StatisticsSummary from './StatisticsSummary.svelte';
 import SourceList from './SourceList.svelte';
 import SectionTitle from './SectionTitle.svelte';
 import ProviderMark from './ProviderMark.svelte';
 import {statisticsCopy,valueOf,type StatisticsChartProps} from '../../statisticsData';
 import '../../preview/statistics-overview.css';
 let {view,measure,language,selected,onSelect,variant}:StatisticsChartProps=$props();
 let explanation=$state(0);
 const copy=$derived(statisticsCopy(language)),total=$derived(valueOf(view.total,measure));
 const largest=$derived([...view.sources].sort((a,b)=>(valueOf(b,measure)??0)-(valueOf(a,measure)??0))[0]);
 const ratios=$derived([
  {name:copy.tr('Leading Source'),value:total&&largest?(valueOf(largest,measure)??0)/total*100:null,readout:total&&largest?largest.name:copy.tr('Share Not Applicable'),detail:copy.tr('Share of %@, not a subscription quota.',copy.metricLabel(measure))},
  {name:copy.tr('Recorded Days'),value:view.covered/view.length*100,readout:`${view.covered} / ${view.length}`,detail:copy.tr('A missing day is unknown, not zero.')},
  {name:copy.tr('Known Costs'),value:view.total.records?view.total.knownCosts/view.total.records*100:null,readout:`${view.total.knownCosts} / ${view.total.records}`,detail:copy.tr('Local records only. Missing data is not zero usage or free usage.')},
 ]);
 function semicircle(from:number,to:number){const at=(part:number)=>`${160+136*Math.cos(Math.PI+part*Math.PI)},${158+136*Math.sin(Math.PI+part*Math.PI)}`;return `M${at(from)}A136 136 0 0 1 ${at(to)}`;}
 const arcs=$derived.by(()=>{let used=0;return view.sources.map(source=>{const value=valueOf(source,measure)??0,start=used/(total||1);used+=value;return {source,value,path:semicircle(start,used/(total||1))};});});
 const choose=(key:string)=>onSelect(selected===key?null:key);
</script>
<div class={`tp-overview tp-overview-${variant}`}>
 {#if variant===0}
  {#if total!==null&&total>0}<div class="tp-semi"><svg viewBox="0 0 320 190" role="group" aria-label={copy.tr('Source Shares')}>{#each arcs as {source,value,path} (source.key)}{#if value}<path d={path} fill="none" stroke={source.color} stroke-width={26} role="button" tabindex="0" aria-label={`${source.name} · ${(value/total*100).toLocaleString(language,{maximumFractionDigits:1})}%`} aria-pressed={selected===source.key} data-dim={selected!==null&&selected!==source.key} onclick={()=>choose(source.key)} onkeydown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(source.key);}}}/>{/if}{/each}</svg><div class="tp-semi-center"><StatisticsSummary {view} {measure} {language} small comparison={false}/></div></div>
  {:else}<StatisticsSummary {view} {measure} {language} comparison={false}/><StatisticsSummary kind="no-values" {view} {measure} {language} unknown={total===null}/>{/if}
  <StatisticsSummary kind="comparison" {view} {measure} {language}/><StatisticsSummary kind="strip" {view} {language}/><SectionTitle>{copy.tr('Source Details')}</SectionTitle><SourceList {view} {measure} {language} {selected} {onSelect}/>
 {:else if variant===1}
  <div class="tp-editorial"><p class="tp-editorial-intro">{copy.tr('Your Recorded Usage Over %@ Days',view.length)}</p><StatisticsSummary {view} {measure} {language}/>
   <div class="tp-editorial-rule" aria-hidden="true">{#if total!==null&&total>0}{#each view.sources as source (source.key)}<i style={`flex:${(valueOf(source,measure)??0)/total};background:${source.color}`}></i>{/each}{/if}</div>
   <div class="tp-editorial-meta"><span>{copy.tr('%@ Recorded Sources',view.sourceCount)}</span><span>{copy.tr('%@ / %@ Days',view.covered,view.length)}</span></div><SectionTitle>{copy.tr('Source Details')}</SectionTitle>
   <div class="tp-editorial-list">{#each view.sources as source (source.key)}<button type="button" aria-pressed={selected===source.key} onclick={()=>choose(source.key)} style={`--source-color:${source.color}`}><ProviderMark {source}/><span>{source.name}<small>{copy.tr('%@ Models',source.models.length)}</small></span><span class="tp-editorial-spark"><StaticSparkline class="tp-sparkline" values={source.days.map(day=>valueOf(day,measure))} style={`color:${source.color}`} height={30} preserveAspectRatio="none"/></span><strong>{copy.format(valueOf(source,measure),measure)}</strong></button>{/each}</div>
   <p class="tp-chart-note">{copy.tr('Small trends use separate scales. Compare the exact values, not their heights.')}</p>
  </div>
 {:else}
  <StatisticsSummary {view} {measure} {language}/><div class="tp-instruments">{#each ratios as ratio,index}<button type="button" aria-pressed={explanation===index} onclick={()=>explanation=index}>{#if ratio.value===null}<div class="tp-mini-unavailable">{copy.tr('Unknown')}</div>{:else}<Gauge value={ratio.value} label={ratio.name} valueText={`${ratio.name} ${ratio.value.toLocaleString(language,{maximumFractionDigits:1})}%`}/>{/if}<span>{ratio.name}</span><small>{ratio.readout}</small></button>{/each}</div><p class="tp-instrument-readout" role="status">{ratios[explanation].detail}</p><SectionTitle>{copy.tr('Source Details')}</SectionTitle><SourceList {view} {measure} {language} {selected} {onSelect} bars={false}/>
 {/if}
</div>
