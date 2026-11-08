<script lang="ts">
 import {ChevronRight} from '@lucide/svelte';
 import ProviderMark from './ProviderMark.svelte';
 import {statisticsCopy,valueOf,type StatisticsChartProps} from '../../statisticsData';
 let {view,measure,language,selected,onSelect,bars=true}:Pick<StatisticsChartProps,'view'|'measure'|'language'|'selected'|'onSelect'>&{bars?:boolean}=$props();
 const copy=$derived(statisticsCopy(language)),total=$derived(valueOf(view.total,measure));
</script>
<div class="tp-sources" aria-label={copy.tr('Source Details')}>{#each view.sources as source (source.key)}
 {@const value=valueOf(source,measure)}{@const share=total&&value!==null?value/total:0}
 <button type="button" class="tp-source-row" aria-pressed={selected===source.key} onclick={()=>onSelect(selected===source.key?null:source.key)} style={`--source-color:${source.color}`}>
  <ProviderMark {source}/><span class="tp-source-name">{source.name}{#if bars}<span class="tp-mini-track" aria-hidden="true"><i style={`width:${share*100}%`}></i></span>{/if}</span>
  <span class="tp-source-number">{copy.format(value,measure)}<small>{value===null?copy.tr('Unknown'):total===0?copy.tr('Share Not Applicable'):`${(share*100).toLocaleString(language,{maximumFractionDigits:1})}%`}{measure==='cost'&&source.knownCosts<source.records&&value!==null?` · ${copy.tr('Partial')}`:''}</small></span><ChevronRight size={14} aria-hidden="true"/>
 </button>
{/each}</div>
