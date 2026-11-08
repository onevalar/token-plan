<script lang="ts">
 import type {Metric} from '../../desktop';
 import type {HomeQuotaDesign} from '../../homeUsage';
 import type {ReadingProps} from './types';
 import HomeInstrumentStyles from './HomeInstrumentStyles.svelte';
 import HomeCellStyles from './HomeCellStyles.svelte';
 import HomeCycleStyles from './HomeCycleStyles.svelte';
 import HomeRailStyles from './HomeRailStyles.svelte';
 import HomeEditorialStyles from './HomeEditorialStyles.svelte';
 import QuotaDetail from './QuotaDetail.svelte';
 import '../../home-quota-designs.css';
 const renderers={instrument:HomeInstrumentStyles,cells:HomeCellStyles,cycle:HomeCycleStyles,rail:HomeRailStyles,editorial:HomeEditorialStyles};
 let {metrics,design,style,...reading}:{metrics:Metric[];design:HomeQuotaDesign;style:string}&ReadingProps=$props();
 let selected=$state<string|null>(null);
 let trigger:HTMLButtonElement|null=null;
 const detailId=$props.id();
 const metric=$derived(metrics.find(m=>m.id===selected));
 const Renderer=$derived(renderers[design.group]);
 function close() {
  selected=null;
  if(trigger?.isConnected){trigger.focus({preventScroll:true});trigger.scrollIntoView({block:'nearest'});}
 }
 function onSelect(id:string,button:HTMLButtonElement){trigger=button;if(id===selected)close();else selected=id;}
</script>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="home-quota-designs" data-style={style} onkeydown={event=>{if(event.key==='Escape'&&metric){event.preventDefault();event.stopPropagation();close();}}}>
 <Renderer {metrics} variant={design.variant} selected={metric?.id??null} {detailId} {onSelect} {...reading}/>
 {#if metric}{#key metric.id}<QuotaDetail id={detailId} {metric} onClose={close} {...reading}/>{/key}{/if}
</div>
