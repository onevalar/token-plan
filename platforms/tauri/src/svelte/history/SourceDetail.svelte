<script lang="ts">
 import {tick} from 'svelte';
 import {Button} from '@valar/svelte-ui/button';
 import SectionTitle from './SectionTitle.svelte';
 import {statisticsCopy,valueOf,type StatisticsView,type StatisticsMeasure} from '../../statisticsData';
 let {view,selected,measure,language,onClose}:{view:StatisticsView;selected:string|null;measure:StatisticsMeasure;language:string;onClose:()=>void}=$props();
 const source=$derived(view.sources.find(item=>item.key===selected)),copy=$derived(statisticsCopy(language));
 let region=$state<HTMLElement>();
 $effect(()=>{let active=true;if(selected){void tick().then(()=>{if(active){region?.focus({preventScroll:true});region?.scrollIntoView({block:'nearest'});}});}return ()=>{active=false;};});
</script>
{#if source}
<!-- A programmatically focused reading region, not an extra tab stop. Escape closes it. -->
<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
<section class="tp-source-detail" bind:this={region} tabindex={-1} aria-label={`${source.name} · ${copy.tr('Model Details')}`} onkeydown={event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();onClose();}}}>
 <SectionTitle>{source.name} · {copy.tr('Model Details')}{#snippet aside()}<Button variant="ghost" size="sm" onclick={onClose}>{copy.tr('Collapse')}</Button>{/snippet}</SectionTitle>
 <p class="tp-source-detail-total">{copy.format(valueOf(source,measure),measure,false)}<span>{measure==='tokens'?' tokens':''}</span></p><p class="tp-caption">{view.bounds.start} – {view.bounds.end}</p>
 {#if source.models.length}<dl class="tp-model-list">{#each source.models as model (model.name)}<div><dt>{model.name}</dt><dd>{copy.format(valueOf(model,measure),measure,false)}{#if measure==='cost'&&model.partial}<small>{copy.tr('Partial')}</small>{/if}</dd></div>{/each}</dl><p class="tp-caption">{copy.tr('Model details may cover only part of the recorded total.')}</p>{:else}<p class="tp-caption">{copy.tr('No model details were provided for these records.')}</p>{/if}
</section>{/if}
