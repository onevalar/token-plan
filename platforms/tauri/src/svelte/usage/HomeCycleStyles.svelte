<script lang="ts">
 import {isQuotaMetric} from '../../metric';
 import {quotaCycle,quotaPercent,preciseQuotaReading} from '../../homeUsage';
 import {providerText} from '../../providerText';
 import {point,clamp,metricAttributes,type Reading,type DesignProps} from './types';
 import QuotaPart from './QuotaPart.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import ScaleTicks from './ScaleTicks.svelte';
 import '../../home-cycle-styles.css';
 type Cycle=ReturnType<typeof quotaCycle>;
 let props:DesignProps=$props();
 const maskPrefix=$props.id();
 const tr=(key:string)=>providerText(key,props.language);
</script>
{#snippet elapsed(cycle:Cycle)}<span class="hq-cycle-elapsed">{cycle.elapsed===null?'—':quotaPercent(Math.round(cycle.elapsed*10)/10,props.language)}</span>{/snippet}
{#snippet lane(value:number|null,time=false)}
 <div class="hq-track hq-cycle-lane" data-channel={time?'time':'quota'} data-unknown={value===null} data-fill={value===null?'unknown':clamp(value)} aria-hidden="true">
  {#if value!==null}<span style:transform={`scaleX(${clamp(value)/100})`}></span><i class="hq-cycle-endpoint" style:left={`${clamp(value)}%`}></i>{/if}
 </div>
{/snippet}
{#snippet clockDial(value:number|null)}
 {#if value===null}<div class="hq-cycle-no-clock" aria-hidden="true">—</div>
 {:else}{@const hand=point(value*3.6,25,48,48)}{@const end=point(value*3.6,34,48,48)}
  <svg class="hq-cycle-dial" viewBox="0 0 96 96" aria-hidden="true" focusable="false" data-time-fill={value}>
   <ScaleTicks start={0} span={360} radius={44} count={61} cx={48} cy={48}/><circle class="hq-cycle-dial-base" cx="48" cy="48" r="34"/><circle class="hq-cycle-dial-elapsed" cx="48" cy="48" r="34" pathLength="100" stroke-dasharray={`${clamp(value)} 100`} transform="rotate(-90 48 48)"/>
   <line class="hq-cycle-dial-hand" x1="48" y1="48" x2={hand.x} y2={hand.y}/><circle class="hq-cycle-dial-pin" cx="48" cy="48" r="2"/><circle class="hq-cycle-dial-pin" cx={end.x} cy={end.y} r="3"/>
  </svg>
 {/if}
{/snippet}
{#snippet racetrack(r:Reading,cycle:Cycle,index:number)}
 {@const mask=`${maskPrefix}-${index}`}
 <div class="hq-cycle-racetrack"><QuotaPart part="meter" {r}><svg viewBox="0 0 320 128" aria-hidden="true" focusable="false">
  <defs><mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="128">{#if cycle.elapsed!==null}<rect x="18" y="18" width="284" height="92" rx="46" fill="none" stroke="white" stroke-width="6" pathLength="100" stroke-dasharray={`${clamp(cycle.elapsed)} 100`}/>{/if}</mask></defs>
  <rect class="hq-cycle-race-base" x="6" y="6" width="308" height="116" rx="58" pathLength="100"/>
  {#if r.value!==null&&r.value>0}<rect class="hq-cycle-race-quota" data-quota-fill={clamp(r.value)} x="6" y="6" width="308" height="116" rx="58" pathLength="100" stroke-dasharray={`${clamp(r.value)} 100`}/>{/if}
  <rect class="hq-cycle-race-time-base" x="18" y="18" width="284" height="92" rx="46" pathLength="100" stroke-dasharray="1 1"/>
  {#if cycle.elapsed!==null}<rect class="hq-cycle-race-time" data-time-fill={cycle.elapsed} x="18" y="18" width="284" height="92" rx="46" pathLength="100" stroke-dasharray="1 1" mask={`url(#${mask})`}/>{/if}
 </svg></QuotaPart><div class="hq-cycle-race-reading" aria-hidden="true"><QuotaPart part="value" {r}/><span class="hq-cycle-mode"><i class="hq-cycle-key"></i>{r.mode} · {tr('Outer Ring')}</span></div></div>
 <div class="hq-cycle-race-legend"><span><i class="hq-cycle-key hq-cycle-key-time" aria-hidden="true"></i>{tr('Cycle Elapsed')} · {tr('Inner Ring')}</span>{@render elapsed(cycle)}</div>
{/snippet}
<div class="hq-cycles" data-variant={props.variant}>
 {#each props.metrics as metric,index (metric.id)}
  {#if !isQuotaMetric(metric)}<QuotaPart part="amount" {metric} {...props}/>
  {:else}{@const r=preciseQuotaReading({metric,...props})}{@const cycle=quotaCycle(metric,props.now)}
   <div class="hq-cycle-item" {...metricAttributes(metric,r)} data-cycle-elapsed={cycle.elapsed??'unknown'}>
    <div class="hq-cycle-heading"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div>
    {#if props.variant===0}{@render racetrack(r,cycle,index)}
    {:else if props.variant===1}<div class="hq-cycle-lanes"><span class="hq-cycle-mode">{r.mode}</span><QuotaPart part="meter" {r}>{@render lane(r.value)}</QuotaPart><QuotaPart part="value" {r} small/><span class="hq-cycle-mode">{tr('Cycle Elapsed')}</span>{@render lane(cycle.elapsed,true)}{@render elapsed(cycle)}</div>
    {:else}<div class="hq-cycle-clock-row"><figure class="hq-cycle-clock">{@render clockDial(cycle.elapsed)}<figcaption><span>{tr('Cycle Elapsed')}</span>{@render elapsed(cycle)}</figcaption></figure><div class="hq-cycle-clock-reading"><span class="hq-cycle-mode">{r.mode}</span><QuotaPart part="meter" {r}><QuotaPart part="value" {r}/></QuotaPart><QuotaPart part="reset" {metric} {...props}/></div></div>{/if}
    {#if props.variant!==2}<div class="hq-cycle-reset"><QuotaPart part="reset" {metric} {...props}/></div>{/if}
    {#if cycle.elapsed===null}<p class="hq-cycle-unavailable">{tr('Cycle progress unavailable')}</p>{/if}<MetricExpiries {metric} {...props}/>
   </div>
  {/if}
 {/each}
</div>
