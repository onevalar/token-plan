<script lang="ts">
 import {tick,onDestroy} from 'svelte';
 import ActivityChart from './ActivityChart.svelte';
 import SourcesChart from './SourcesChart.svelte';
 import QuotaChart from './QuotaChart.svelte';
 import StatisticsOverview from './StatisticsOverview.svelte';
 import StatisticsComposition from './StatisticsComposition.svelte';
 import StatisticsTime from './StatisticsTime.svelte';
 import StatisticsCompare from './StatisticsCompare.svelte';
 import StatisticsBudget from './StatisticsBudget.svelte';
 import StatisticsSummary from './StatisticsSummary.svelte';
 import SourceDetail from './SourceDetail.svelte';
 import {moduleStyles,type ModuleID} from '../../statisticsModel';
 import type {StatisticsView,StatisticsMeasure} from '../../statisticsData';
 import type {Account} from '../../desktop';
 let {id,style,view,measure,language,accounts,scope,range}:{id:Exclude<ModuleID,'records'>;style:string;view:StatisticsView;measure:StatisticsMeasure;language:string;accounts:Account[];scope:string;range:string}=$props();
 let selected=$state<string|null>(null),day=$state<string|null>(null);
 let origin:HTMLElement|SVGElement|null=null,clicked:HTMLElement|SVGElement|null=null,focusFrame=0;
 const index=$derived((moduleStyles[id] as readonly string[]).indexOf(style));
 async function close(){selected=null;await tick();focusFrame=requestAnimationFrame(()=>{if(origin?.isConnected)origin.focus();});}
 function onSelect(key:string|null){if(key===null){void close();return;}origin=clicked??document.activeElement as HTMLElement|SVGElement|null;clicked=null;selected=key;}
 const chart=$derived({view,measure,language,selected,onSelect,day,onDay:(value:string|null)=>day=value,variant:index});
 onDestroy(()=>cancelAnimationFrame(focusFrame));
</script>
<!-- Capture activation before details move focus, including focusable SVG marks. -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="statistics-design" onclickcapture={event=>{if(event.target instanceof Element){const target=event.target.closest<HTMLElement|SVGElement>('button,[role="button"]');if(target&&!target.closest('.tp-source-detail'))clicked=target;}}} onkeydowncapture={()=>clicked=null}>
 {#if id==='overview'}{#if index===0}<StatisticsSummary kind="simple" {view} {language}/>{:else}<StatisticsOverview {...chart} variant={index-1}/>{/if}
 {:else if id==='activity'}{#if index<3}<ActivityChart {view} {measure} {language} {style}/>{:else}<StatisticsTime {...chart} variant={index-3}/>{/if}
 {:else if id==='sources'}{#if index<2}<SourcesChart {view} {measure} {language} {style}/>{:else}<StatisticsComposition {...chart} variant={index-2}/>{/if}
 {:else if id==='comparison'}<StatisticsCompare {...chart}/>
 {:else if id==='budget'}<StatisticsBudget {...chart} measure="cost" {scope} {range}/>
 {:else}<QuotaChart {accounts} {range} {language} {style}/>{/if}
 <SourceDetail {view} {selected} measure={id==='budget'?'cost':measure} {language} onClose={()=>void close()}/>
</div>
