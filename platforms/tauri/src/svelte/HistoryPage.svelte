<script lang="ts">
 import {untrack} from 'svelte';
 import {SegmentedControl} from '@valar/svelte-ui/segmented-control';
 import SelectField from './SelectField.svelte';
 import HistoryRanges from './history/HistoryRanges.svelte';
 import HistoryFallback from './history/HistoryFallback.svelte';
 import HistoryRecords from './history/HistoryRecords.svelte';
 import StatisticsModules from './history/StatisticsModules.svelte';
 import StatisticsContent from './history/StatisticsContent.svelte';
 import StatisticsSummary from './history/StatisticsSummary.svelte';
 import {providerText} from '../providerText';
 import {dateKey} from '../historyModel';
 import {statisticsView,type StatisticsRange,type StatisticsMeasure} from '../statisticsData';
 import type {Account} from '../desktop';
 import type {Copy} from '../copy';
 import '../preview/statistics.css';
 import '../preview/statistics-designs.css';
 let {accounts,t,language,initialRange='30'}:{accounts:Account[];t:Copy;language:string;initialRange?:string}=$props();
 let scope=$state('all'),range=$state(untrack(()=>initialRange)),measure=$state<StatisticsMeasure>('tokens');
 let page=$state(0),expanded=$state<string|null>(null),modelRow=$state<string|null>(null);
 function resetRecords(){page=0;expanded=null;modelRow=null;}
 const scoped=$derived(scope==='all'?accounts:accounts.filter(a=>a.id===scope));
 const today=$derived(dateKey(new Date()));
 const view=$derived(statisticsView(scoped,range as StatisticsRange,new Date(`${today}T12:00:00`)));
 const referenceScope=$derived(scoped.length===1?scoped[0].id:scope);
 const tr=(s:string)=>providerText(s,language);
</script>
<div class="history-page">
 {#if accounts.length>1}<div class="history-filter"><SelectField label={tr('Account')} value={scope} onValueChange={v=>{scope=v;resetRecords();}} options={[{value:'all',label:t.all},...accounts.map(a=>({value:a.id,label:a.email?`${a.name} · ${a.email}`:a.name}))]}/></div>{/if}
 <HistoryRanges {language} {range} onRange={value=>{range=value;resetRecords();}}/>
 <div class="statistics-measure"><SegmentedControl label={tr('Chart Measure')} options={[{value:'tokens',label:t.tokens},{value:'cost',label:scoped.some(a=>['openai','anthropic'].includes(a.family))?tr('Known Cost'):t.cost}]} value={measure} onValueChange={value=>measure=value as StatisticsMeasure}/><span>{view.bounds.start} – {view.bounds.end}</span></div>
 <p class="group-description">{scoped.some(a=>['openai','anthropic'].includes(a.family))?tr('Official API reports use UTC and may be delayed. Model costs are unavailable; local records may overlap API reports.'):t.deviceHistory}</p>
 {#if (view.partial||!view.costComplete)&&view.rows.length>0}<p class="notice" role="status">{t.historyWarning}</p>{/if}
 {#key range}<StatisticsModules {language} {range}>{#snippet children(id,style)}
  {#if id==='overview'&&!view.rows.length}<HistoryFallback accounts={scoped} {t} {language} {range}/>
  {:else if id==='records'}<HistoryRecords rows={view.rows} {t} {language} bind:page bind:expanded bind:modelRow/>
  {:else}{#key `${id}:${style}:${scope}:${range}:${measure}`}<StatisticsContent {id} {style} {view} {measure} {language} accounts={scoped} scope={referenceScope} {range}/>{/key}{/if}
 {/snippet}</StatisticsModules>{/key}
 <div class="statistics-design"><StatisticsSummary kind="coverage" {view} {language}/></div>
</div>
