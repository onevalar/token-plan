<script lang="ts">
 import {statisticsCopy,valueOf,type StatisticsView,type StatisticsMeasure} from '../../statisticsData';
 let {view,measure,language,style}:{view:StatisticsView;measure:StatisticsMeasure;language:string;style:string}=$props();
 const copy=$derived(statisticsCopy(language)),days=$derived(view.days.map(day=>({...day,value:valueOf(day,measure)}))),max=$derived(Math.max(Number.EPSILON,...days.map(d=>d.value??0)));
 let hovered=$state<string|null>(null);const tooltipID=$props.id();
 const selected=$derived(days.find(d=>d.date===hovered));
 const reading=(d:typeof days[number])=>`${d.date}: ${d.value==null?copy.tr('No Recorded Data'):copy.format(d.value,measure,false)+' '+copy.unit(measure)}${d.incomplete||measure==='cost'&&d.partial?` · ${copy.tr('Recorded Portion Only')}`:''}`;
 const offset=$derived(new Date(`${days[0].date}T12:00:00`).getDay());
</script>
<p class="statistics-caption">{copy.tr(measure==='tokens'?'Daily Token Usage':'Daily Known Cost')}</p><div class="statistics-chart-interactive">{#if selected}<div class="statistics-tooltip" id={tooltipID} role="tooltip">{reading(selected)}</div>{/if}<div class={`statistics-activity ${style==='Activity Calendar'?'statistics-calendar':style==='Folded Bands'?'statistics-horizon':'statistics-bars'}`} role="list">
 {#if style==='Activity Calendar'}{#each Array(offset) as _,i}<span aria-hidden="true"></span>{/each}{/if}
 {#each days as d (d.date)}
 <!-- Focus exposes the exact reading; Escape dismisses the existing source tooltip. -->
 <!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
 <div role="listitem" class="statistics-day" tabindex={0} onmouseenter={()=>hovered=d.date} onmouseleave={()=>hovered=null} onfocus={()=>hovered=d.date} onblur={()=>hovered=null} onkeydown={e=>{if(e.key==='Escape')hovered=null;}} aria-describedby={hovered===d.date?tooltipID:undefined} data-missing={d.value==null} aria-label={reading(d)}>
  {#if style==='Folded Bands'}<svg viewBox="0 0 10 40" preserveAspectRatio="none" aria-hidden="true">{#if d.value!=null}{#each [0,1,2] as band}{@const height=Math.max(0,Math.min(1,d.value/max*3-band))*40}<rect x="0" y={40-height} width="10" {height} fill={`var(--statistics-band-${band})`}/>{/each}{/if}</svg>{:else}<span class="statistics-day-fill" style={style==='Activity Calendar'?`opacity:${d.value==null?0:.12+.88*d.value/max}`:`height:${d.value==null?0:`${d.value/max*100}%`}`}></span>{/if}
  {#if style==='Activity Calendar'}<span class="statistics-date">{Number(d.date.slice(-2))}</span>{/if}
 </div>{/each}
</div></div><div class="statistics-axis"><span>{days[0].date}</span><span>{days.at(-1)!.date}</span></div>
{#if style==='Folded Bands'&&max>Number.EPSILON}<p class="statistics-caption">{copy.tr('Each darker band adds')}: {copy.format(max/3,measure,false)} {copy.unit(measure)}</p>{/if}
<p class="statistics-caption">{copy.tr('Empty cells have no recorded data, not zero usage.')}</p>
