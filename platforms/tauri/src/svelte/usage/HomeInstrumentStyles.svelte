<script lang="ts">
 import {isQuotaMetric} from '../../metric';
 import {preciseQuotaReading} from '../../homeUsage';
 import {metricAttributes,point,arcPath,clamp,type DesignProps,type Reading} from './types';
 import QuotaPart from './QuotaPart.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import ScaleTicks from './ScaleTicks.svelte';
 import Needle from './Needle.svelte';
 import '../../home-instrument-styles.css';
 let props:DesignProps=$props();
</script>
{#snippet dial(r:Reading)}<div class="hq-instrument-dial"><Needle {r} remaining={props.remaining}/><div class="hq-instrument-readout"><QuotaPart part="value" {r}/></div></div>{/snippet}
{#snippet sideDial(r:Reading)}
 {@const v=clamp(r.value??0)}{@const p=point(180*v/100,59,4,72)}{@const b=point(180*(props.remaining?20:80)/100,65,4,72)}
 <div class="hq-side-scale" aria-hidden="true"><span>0</span><svg viewBox="0 0 96 144" focusable="false"><ScaleTicks start={0} span={180} radius={69} cx={4} cy={72} count={31}/><path class="hq-chart-track" d={arcPath(0,180,59,4,72)} stroke-width="3"/>
  {#if r.value!==null}<path class="hq-chart-fill" d={arcPath(0,180*v/100,59,4,72)} stroke-width="3" opacity={v===0?0:1}/><circle cx={p.x} cy={p.y} r="4" class="hq-side-dot" data-needle-value={v}/>{/if}<circle cx={b.x} cy={b.y} r="2" class="hq-side-boundary"/>
 </svg><span>100</span></div>
{/snippet}
<div class={props.variant===2?'hq-primary-instruments':'hq-instruments'} data-variant={props.variant===2?undefined:props.variant}>
 {#each props.metrics as metric (metric.id)}
  {#if !isQuotaMetric(metric)}<QuotaPart part="amount" {metric} {...props}/>
  {:else}
   {@const r=preciseQuotaReading({metric,...props})}
   {#if props.variant===2}<div class="hq-primary-row" {...metricAttributes(metric,r)}><QuotaPart part="meter" {r} class="hq-primary-face"><Needle {r} remaining={props.remaining}/></QuotaPart>
    <div class="hq-primary-context"><div class="hq-primary-heading"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="value" {r} small/></div><QuotaPart part="reset" {metric} {...props}/><QuotaPart part="status" {r} missing={props.missing}/><MetricExpiries {metric} {...props}/></div>
   </div>
   {:else if props.variant===1}<div class="hq-side-instrument" {...metricAttributes(metric,r)}><div class="hq-side-reading"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="value" {r}/><span class="hq-side-mode">{r.mode}</span><QuotaPart part="reset" {metric} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div><QuotaPart part="meter" {r}>{@render sideDial(r)}</QuotaPart><MetricExpiries {metric} {...props}/></div>
   {:else}<div class="hq-needle-instrument" {...metricAttributes(metric,r)}><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="meter" {r}>{@render dial(r)}</QuotaPart><div class="hq-instrument-meta"><QuotaPart part="reset" {metric} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div><MetricExpiries {metric} {...props}/></div>{/if}
  {/if}
 {/each}
</div>
