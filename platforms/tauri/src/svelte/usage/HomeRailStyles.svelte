<script lang="ts">
 import {isQuotaMetric} from '../../metric';
 import {preciseQuotaReading} from '../../homeUsage';
 import {clamp,metricAttributes,type DesignProps,type Reading} from './types';
 import QuotaPart from './QuotaPart.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import FoldedRuler from './FoldedRuler.svelte';
 import '../../home-rail-styles.css';
 let props:DesignProps=$props();
 const divisions=Array.from({length:21},(_,i)=>i*5);
</script>
{#snippet horizontal(r:Reading)}<QuotaPart part="meter" {r} class="hq-rail-horizontal-meter"><div class="hq-rail-horizontal-scale" aria-hidden="true"><div class="hq-rail-axis">
 {#each divisions as value (value)}<i class="hq-rail-tick" data-major={value%25===0} style:left={`${value}%`}></i>{/each}{#if r.value!==null}<span class="hq-rail-dot" data-rail-marker style:left={`${clamp(r.value)}%`}></span>{/if}
 </div><div class="hq-rail-scale-labels"><span>0</span><span>50</span><span>100</span></div></div></QuotaPart>{/snippet}
{#snippet edge(r:Reading)}<QuotaPart part="meter" {r} class="hq-rail-edge-meter"><div class="hq-rail-edge-scale" aria-hidden="true"><span class="hq-rail-edge-end">100</span><div class="hq-rail-edge-axis">
 {#each divisions.filter(value=>value%10===0) as value (value)}<i class="hq-rail-edge-tick" data-major={value%50===0} style:bottom={`${value}%`}></i>{/each}{#if r.value!==null}<span class="hq-rail-edge-dot" data-rail-marker style:bottom={`${clamp(r.value)}%`}></span>{/if}
 </div><span class="hq-rail-edge-end">0</span></div></QuotaPart>{/snippet}
<div class="hq-rails" data-variant={props.variant}>
 {#each props.metrics as metric (metric.id)}
  {#if !isQuotaMetric(metric)}<QuotaPart part="amount" {metric} {...props}/>
  {:else}{@const r=preciseQuotaReading({metric,...props})}
   <section class={`hq-rail-row hq-rail-${['horizontal','edge','folded'][props.variant]}`} {...metricAttributes(metric,r)}>
    {#if props.variant===0}<div class="hq-rail-inline"><div class="hq-rail-caption"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="reset" {metric} {...props}/></div><div class="hq-rail-reading"><QuotaPart part="value" {r} small/><QuotaPart part="status" {r} missing={props.missing}/></div></div>{@render horizontal(r)}
    {:else if props.variant===1}<div class="hq-rail-edge-body"><QuotaPart part="label" {metric} {r} {...props}/><div class="hq-rail-edge-readout"><QuotaPart part="value" {r}/><div class="hq-rail-edge-meta"><QuotaPart part="reset" {metric} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div></div></div>{@render edge(r)}
    {:else}<div class="hq-rail-fold-heading"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="value" {r} small/></div><FoldedRuler {r}/><div class="hq-rail-fold-meta"><QuotaPart part="reset" {metric} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div>{/if}
    <div class="hq-rail-expiries"><MetricExpiries {metric} {...props}/></div>
   </section>
  {/if}
 {/each}
</div>
