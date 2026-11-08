<script lang="ts">
 import {historyColor} from '../../historyModel';
 import {treeRects} from '../../statisticsModel';
 import {statisticsCopy,valueOf,type StatisticsView,type StatisticsMeasure} from '../../statisticsData';
 let {view,measure,language,style}:{view:StatisticsView;measure:StatisticsMeasure;language:string;style:string}=$props();
 const copy=$derived(statisticsCopy(language)),parts=$derived(view.sources.map(source=>({label:source.name,value:valueOf(source,measure)})).sort((a,b)=>(b.value??-1)-(a.value??-1))),sum=$derived(valueOf(view.total,measure));
 const positive=$derived(parts.filter((part):part is {label:string;value:number}=>part.value!==null&&part.value>0));
</script>
{#if sum===null}<p>{copy.tr(measure==='cost'?'Cost Not Recorded':'No Recorded Data')}</p>{:else}<p class="statistics-caption">{copy.tr(measure==='tokens'?'Share of Recorded Tokens':'Share of Known Cost')}</p>{#if sum===0}<p>{copy.tr('Recorded Zero')}</p>{/if}
 {#if style==='Source Treemap'&&sum>0}<svg class="statistics-tree" viewBox="0 0 100 60" role="img" aria-label={copy.tr('Source Composition')}>{#each treeRects(positive) as p (p.label)}<rect x={p.x} y={p.y} width={p.w} height={p.h} fill={historyColor(p.label)} stroke="var(--surface)" stroke-width=".3"/>{/each}</svg>{/if}
 <ol class="statistics-sources">{#each parts as p (p.label)}<li><i style={`background:${historyColor(p.label)}`}></i><span>{p.label}<small>{copy.format(p.value,measure,false)} {copy.unit(measure)}</small></span><strong>{p.value===null?copy.tr('Unknown'):sum===0?copy.tr('Share Not Applicable'):(p.value/sum).toLocaleString(language,{style:'percent',maximumFractionDigits:1})}</strong></li>{/each}</ol>
{/if}
