<script lang="ts">
 import {isQuotaMetric} from '../../metric';
 import {preciseQuotaReading} from '../../homeUsage';
 import {providerText} from '../../providerText';
 import {clamp,metricAttributes,type DesignProps} from './types';
 import QuotaPart from './QuotaPart.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import '../../home-cell-styles.css';
 let props:DesignProps=$props();
 const readings=$derived(props.metrics.map(metric=>({metric,r:isQuotaMetric(metric)?preciseQuotaReading({metric,...props}):null})));
 const paired=$derived(readings.length===2&&readings.every(({r})=>r!==null&&r.name.length<=24&&r.valueText.length<=7));
</script>
{#snippet battery(value:number|null)}
 <svg viewBox="0 0 64 146" aria-hidden="true" focusable="false" data-unknown={value===null}>
  <rect class="hq-b-battery-terminal" x="24" y="3" width="16" height="6" rx="2"/><rect class="hq-b-battery-shell" x="6" y="10" width="52" height="130" rx="8"/>
  {#if value===null}<path class="hq-b-battery-unknown" d="M24 75h16"/>{:else}{#each Array.from({length:10}) as _,i (i)}{@const y=17+i*12}{@const fraction=Math.max(0,Math.min(1,clamp(value)/10-(9-i)))}<g data-segment={9-i} data-fraction={fraction}><rect class="hq-b-battery-track" x="12" {y} width="40" height="8" rx="1.5"/>{#if fraction>0}<rect class="hq-b-battery-fill" x="12" y={y+8*(1-fraction)} width="40" height={8*fraction} rx="1.5"/>{/if}</g>{/each}{/if}
 </svg>
{/snippet}
<div class="hq-cell-styles" data-variant={props.variant}><div class="hq-b-layout" data-paired={props.variant===2&&paired}>
 {#each readings as {metric,r} (metric.id)}
  {#if r===null}<QuotaPart part="amount" {metric} {...props}/>
  {:else if props.variant===0}<div class="hq-b-dot" {...metricAttributes(metric,r)}><QuotaPart part="label" {metric} {r} {...props}/><div class="hq-b-dot-body"><div class="hq-b-dot-reading"><QuotaPart part="value" {r}/><span class="hq-b-mode">{r.mode}</span><QuotaPart part="status" {r} missing={props.missing}/><QuotaPart part="reset" {metric} {...props}/></div><QuotaPart part="meter" {r} class="hq-b-dot-matrix">{#if r.value===null}<div class="hq-b-no-signal" aria-hidden="true">—</div>{:else}<QuotaPart part="cells" value={r.value} count={100} columns={10} shape="round"/>{/if}</QuotaPart></div><MetricExpiries {metric} {...props}/></div>
  {:else if props.variant===1}<div class="hq-b-grille" {...metricAttributes(metric,r)} data-remaining={props.remaining??false} style:--hq-b-boundary={props.remaining?.2:.8}>
   <div class="hq-b-grille-heading"><QuotaPart part="label" {metric} {r} {...props}/><div class="hq-b-grille-reading"><QuotaPart part="value" {r}/><span class="hq-b-mode">{r.mode}</span></div></div>
   <div class="hq-b-grille-scale"><QuotaPart part="meter" {r} class="hq-b-grille-meter">{#if r.value===null}<div class="hq-b-no-signal" aria-hidden="true">—</div>{:else}<QuotaPart part="cells" value={r.value} count={40} columns={40} shape="slash"/>{/if}</QuotaPart><span class="hq-b-grille-boundary" aria-hidden="true"></span><div class="hq-b-grille-axis"><span aria-hidden="true">0%</span><span class="hq-b-boundary-label">{providerText(props.remaining?'20% Remaining Warning':'80% Used Warning',props.language)}</span><span aria-hidden="true">100%</span></div></div>
   <div class="hq-b-grille-footer"><QuotaPart part="status" {r} missing={props.missing}/><QuotaPart part="reset" {metric} {...props}/></div><MetricExpiries {metric} {...props}/>
  </div>
  {:else}<div class="hq-b-battery" {...metricAttributes(metric,r)}><div class="hq-b-battery-label"><QuotaPart part="label" {metric} {r} {...props}/></div><div class="hq-b-battery-reading"><QuotaPart part="value" {r}/><span class="hq-b-mode">{r.mode}</span></div><QuotaPart part="meter" {r} class="hq-b-battery-meter">{@render battery(r.value)}</QuotaPart><div class="hq-b-battery-status"><QuotaPart part="status" {r} missing={props.missing}/></div><div class="hq-b-battery-reset"><QuotaPart part="reset" {metric} {...props}/></div><MetricExpiries {metric} {...props}/></div>{/if}
 {/each}
</div></div>
