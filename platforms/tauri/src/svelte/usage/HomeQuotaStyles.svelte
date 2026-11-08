<script lang="ts">
 import {GaugeArc} from '@valar/svelte-ui/gauge';
 import type {Metric} from '../../desktop';
 import {isQuotaMetric} from '../../metric';
 import {forecastSpan,projectedUsed,quotaReading,quotaMeter,type StyleSpec} from '../../homeUsage';
 import {providerText} from '../../providerText';
 import {cssText,type ReadingProps} from './types';
 import MetricRow from './MetricRow.svelte';
 import MetricReset from './MetricReset.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import '../../home-quota-styles.css';
 let {metrics,spec,...props}:{metrics:Metric[];spec:StyleSpec}&ReadingProps=$props();
 const pairing=$derived.by(()=>{
  const paired=new Map<number,Metric[]>(),consumed=new Set<number>();
  if(spec.root==='concentric')for(let i=0;i<metrics.length-1;i++){
   const a=metrics[i],b=metrics[i+1];
   if(!consumed.has(i)&&isQuotaMetric(a)&&isQuotaMetric(b)&&(a.periodSeconds??0)>0&&(b.periodSeconds??0)>0&&a.periodSeconds!==b.periodSeconds){paired.set(i,[a,b]);consumed.add(i+1);i++;}
  }
  return {paired,consumed};
 });
</script>
{#snippet reset(metric:Metric)}{#if metric.hasData}<span class="home-reset"><MetricReset {metric} {...props}/></span>{/if}{/snippet}
{#snippet readout(metric:Metric,position?:string,hideValue=false)}
 {@const r=quotaReading({metric,...props})}
 <div class="home-readout"><div class="home-quota-heading"><span>{#if position}<small class="home-ring-position">{position}</small>{/if}{r.name}</span>{#if !hideValue}<strong>{r.value===null?'—':r.valueText}</strong>{/if}</div>
  {#if r.value===null}<p class="home-quota-unknown quota-missing">{props.missing}</p>{/if}
  {#if metric.hasData}<div class="home-quota-meta"><MetricReset {metric} {...props}/></div>{/if}<MetricExpiries {metric} {...props}/>
 </div>
{/snippet}
{#snippet quota(metric:Metric)}
 {@const r=quotaReading({metric,...props})}{@const threshold=props.remaining?20:80}{@const forecast=projectedUsed(metric,props.now,r.used)}
 {#if spec.root==='numbers'}
  <article class="home-reading home-number" data-metric={metric.id} data-tone={r.tone} aria-label={r.label}>
   <div class="home-number-label"><span>{r.name}</span></div><span class="home-quota-sr">{r.description}</span><p class="home-number-value" aria-hidden="true"><strong>{r.value===null?'—':Math.round(r.value)}</strong>{#if r.value!==null}<span>%</span>{/if}</p>
   {#if r.value===null}<p class="quota-missing">{props.missing}</p>{/if}{@render reset(metric)}<MetricExpiries {metric} {...props}/>
  </article>
 {:else if spec.root==='ruler'}
  <div class="home-reading home-ruler" data-metric={metric.id} data-tone={r.tone}>
   <div class="home-ruler-heading"><span>{r.name}</span><strong>{r.value===null?'—':r.valueText}</strong>{#if metric.hasData}<MetricReset {metric} {...props}/>{/if}</div>
   {#if r.value===null}<p class="home-quota-unknown quota-missing">{props.missing}</p>{:else}<div {...quotaMeter(r)}><div class="home-ruler-graphic" aria-hidden="true"><div class="home-ruler-bar">
    <div class="home-ruler-track"><span style:transform={`scaleX(${Math.max(0,Math.min(1,r.value/100))})`}></span></div>
    {#if spec.forecast&&forecast!==null}<span class="home-forecast-stripe" style={cssText(forecastSpan(r.used!,forecast,props.remaining??false))}></span>{/if}
    <span class="home-ruler-limit" style:left={props.remaining?'0%':'100%'}></span><span class="home-ruler-threshold" style:left={`${threshold}%`}></span>
   </div><div class="home-ruler-ticks">{#each [0,20,40,60,80,100] as tick (tick)}<span style:left={`${tick}%`}>{tick===threshold?`${tick} ⚑`:tick}</span>{/each}</div></div></div>{/if}
   <MetricExpiries {metric} {...props}/>
  </div>
 {:else if spec.root==='segments'}
  <div class="home-reading home-segments" data-metric={metric.id} data-tone={r.tone}>
   <div class="home-segment-label"><span>{r.name}</span>{@render reset(metric)}</div><div class="home-segment-reading">
    {#if r.value===null}<div class="home-quota-unknown quota-missing">{props.missing}</div>{:else}<div {...quotaMeter(r)}><div class="home-segment-track" data-shape={spec.shape} aria-hidden="true" style:grid-template-columns={`repeat(${spec.count},minmax(0,1fr))`}>
     {#each Array.from({length:spec.count}) as _,i (i)}<span style:height={spec.shape==='rising'?`${40+60*i/Math.max(1,spec.count-1)}%`:undefined}><span style:transform={`scaleX(${Math.max(0,Math.min(1,r.value/(100/spec.count)-i))})`}></span></span>{/each}
    </div></div>{/if}<strong aria-hidden="true">{r.value===null?'—':r.valueText}</strong>
   </div><MetricExpiries {metric} {...props}/>
  </div>
 {:else}
  <div class="home-reading home-compact" data-metric={metric.id} data-tone={r.tone}><div class="home-small-meter" {...quotaMeter(r)}><svg viewBox="0 0 100 90" aria-hidden="true" focusable="false"><GaugeArc value={r.value} tone={r.tone==='critical'?'danger':'accent'} style="--primary:var(--quota-color);--destructive:var(--danger);--border:var(--border-strong)"/></svg><strong class="home-ring-value" aria-hidden="true">{r.value===null?'—':r.valueText}</strong></div>{@render readout(metric,undefined,true)}</div>
 {/if}
{/snippet}
<div class="home-metrics home-variants" data-style={spec.root} data-quota-count={spec.root==='numbers'?metrics.filter(isQuotaMetric).length:undefined}>
 {#each metrics as metric,index (metric.id)}
  {#if !pairing.consumed.has(index)}
   {@const quotas=pairing.paired.get(index)}
   {#if !isQuotaMetric(metric)}<div class="home-metric-row"><MetricRow {metric} {...props}/></div>
   {:else if quotas}<div class="home-concentric"><svg viewBox="0 0 100 90" aria-hidden="true" focusable="false">{#each quotas as m,i (m.id)}{@const r=quotaReading({metric:m,...props})}<GaugeArc value={r.value} radius={i===0?42:28} tone={r.tone==='critical'?'danger':'accent'} style={`--primary:var(--provider-color,var(--usage-normal));--destructive:var(--danger);--border:var(--border-strong)`}/>{/each}</svg>
    <div class="home-concentric-readings">{#each quotas as m,i (m.id)}{@const r=quotaReading({metric:m,...props})}<div class="home-reading" data-metric={m.id} data-tone={r.tone}><span class="home-quota-sr" {...quotaMeter(r)}></span>{@render readout(m,providerText(i===0?'Outer Ring':'Inner Ring',props.language))}</div>{/each}</div>
   </div>{:else}{@render quota(metric)}{/if}
  {/if}
 {/each}
</div>
