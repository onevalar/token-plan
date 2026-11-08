<script module lang="ts">
 export type {SourceShare} from './types';
</script>
<script lang="ts">
 import {TrendingUp} from '@lucide/svelte';
 import {TextureFill} from '@valar/svelte-ui/texture-fill';
 import type {Metric} from '../../desktop';
 import {isQuotaMetric} from '../../metric';
 import {forecastSpan,projectedUsed,quotaMeter,quotaReading,usageLevel,type StyleSpec} from '../../homeUsage';
 import {providerText} from '../../providerText';
 import {textureAt,tintStyle} from '../../texture';
 import {clamp,cssText,type ReadingProps,type SourceShare} from './types';
 import MetricRow from './MetricRow.svelte';
 import MetricReset from './MetricReset.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import Vessel from './Vessel.svelte';
 import '../../home-extra-styles.css';
 let {metrics,spec,sources,...props}:{metrics:Metric[];spec:StyleSpec;sources:SourceShare[]}&ReadingProps=$props();
 const quotas=$derived(metrics.filter(isQuotaMetric));
</script>
{#snippet row(metric:Metric)}<div class="home-metric-row"><MetricRow {metric} {...props}/></div>{/snippet}
{#snippet reset(metric:Metric)}{#if metric.hasData}<MetricReset {metric} {...props}/>{/if}{/snippet}
{#snippet missing(value:number|null)}{#if value===null}<p class="home-quota-unknown quota-missing">{props.missing}</p>{/if}{/snippet}
{#snippet sourcesItem(metric:Metric)}
 {@const r=quotaReading({metric,...props,remaining:false})}{@const used=r.used}{@const top=sources.slice(0,3)}{@const rest=1-top.reduce((n,s)=>n+s.share,0)}{@const parts=[...top,...rest>0.005?[{name:providerText('Other',props.language),share:rest}]:[]]}
 <div class="home-reading home-sources" data-metric={metric.id} data-tone={r.tone}><div class="home-quota-heading"><span>{r.name}</span><strong>{used===null?'—':`${Math.round(used)}%`}</strong></div>
  {#if used!==null}<div role="meter" aria-label={`${r.name} · ${providerText('Used',props.language)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamp(used)} aria-valuetext={parts.map(p=>`${p.name} ${Math.round(used*p.share)}%`).join(', ')}>
   <div class="home-ruler-track home-sources-track" aria-hidden="true">{#each parts as p,i (p.name)}<span style:width={`${clamp(used)*p.share}%`} style:opacity={[1,.7,.45,.25][i]}></span>{/each}</div><ul class="home-sources-legend" aria-hidden="true">{#each parts as p,i (p.name)}<li><i style:opacity={[1,.7,.45,.25][i]}></i><span>{p.name}</span><b>{Math.round(used*p.share)}%</b></li>{/each}</ul>
  </div>{/if}<div class="home-quota-meta">{#if used===null}<span>{props.missing}</span>{/if}{@render reset(metric)}</div><MetricExpiries {metric} {...props}/>
 </div>
{/snippet}
{#snippet item(metric:Metric,index:number)}
 {@const r=quotaReading({metric,...props})}{@const texture=textureAt(spec.texture,index)}
 {#snippet heading()}<div class="home-quota-heading"><span>{r.name}</span><strong>{r.value===null?'—':r.valueText}</strong></div>{/snippet}
 {#snippet textureFill()}{#if r.value!==null}<TextureFill class={spec.layout==='card'?'home-rowfill-texture':'home-texture-meter'} value={clamp(r.value)} {texture} intro/>{/if}{/snippet}
 {#snippet textureReading()}<strong class="home-rowfill-value" aria-hidden="true">{r.value===null?'—':r.valueText}</strong><span class="home-rowfill-meta"><span>{r.name}</span><MetricReset {metric} {...props}/></span>{/snippet}
 {#if spec.family==='bars'}
  {@const forecast=projectedUsed(metric,props.now,r.used)}
  <div class="home-reading home-forecast" data-metric={metric.id} data-tone={r.tone}>{@render heading()}
   {#if r.value!==null}<div {...quotaMeter(r)}><div class="home-ruler-bar" aria-hidden="true"><div class="home-ruler-track"><span style:transform={`scaleX(${clamp(r.value)/100})`}></span></div>{#if forecast!==null}<span class="home-forecast-stripe" style={cssText(forecastSpan(r.used!,forecast,props.remaining??false))}></span>{/if}<span class="home-ruler-limit" style:left={props.remaining?'0%':'100%'}></span></div></div>{/if}
   <div class="home-quota-meta">{#if forecast!==null}<span class="home-forecast-marker" aria-label={providerText('Projected %@ by reset',props.language).replace('%@',`${Math.round(forecast)}%`)}><TrendingUp size={13} aria-hidden="true"/><span aria-hidden="true">{Math.round(forecast)}%</span></span>{/if}{@render reset(metric)}</div>{@render missing(r.value)}<MetricExpiries {metric} {...props}/>
  </div>
 {:else if spec.family==='vessel'}<div class="home-reading home-vessel" data-shape={spec.vessel} data-metric={metric.id} data-tone={r.tone}><div class="home-vessel-graphic" {...quotaMeter(r)}>{#if r.value!==null}<Vessel shape={spec.vessel} value={clamp(r.value)}/>{/if}</div><div class="home-readout">{@render heading()}<div class="home-quota-meta">{#if r.value===null}<span>{props.missing}</span>{/if}{@render reset(metric)}</div><MetricExpiries {metric} {...props}/></div></div>
 {:else if spec.family==='frame'}<div class="home-reading home-frame" data-metric={metric.id} data-tone={r.tone} {...quotaMeter(r)}><svg viewBox="0 0 340 64" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="home-frame-track" x="2" y="2" width="336" height="60" rx="16" pathLength="100"/>{#if r.value!==null}<rect class="home-frame-fill" x="2" y="2" width="336" height="60" rx="16" pathLength="100" stroke-dasharray={`${clamp(r.value)} 100`}/>{/if}</svg><div class="home-frame-body"><strong class="home-frame-value">{r.value===null?'—':r.valueText}</strong><div class="home-frame-details"><span>{r.name}</span>{#if r.value===null}<span class="home-frame-missing">{props.missing}</span>{:else}{@render reset(metric)}{/if}</div></div></div>
 {:else if spec.family==='signal'}
  {@const level=usageLevel(r.used)}{@const lit=['calm','watch','critical'].indexOf(level)}
  <div class="home-reading home-signal" data-level={level} data-metric={metric.id} data-tone={r.tone}>{@render heading()}<div class="home-signal-line" {...quotaMeter(r)}><span class="home-signal-lamps" aria-hidden="true">{#each [0,1,2] as i (i)}<span data-on={r.value!==null&&i===lit}></span>{/each}</span>{@render reset(metric)}</div>{@render missing(r.value)}<MetricExpiries {metric} {...props}/></div>
 {:else if spec.family==='texturebar'}
  {#if spec.layout==='card'}<div class="home-reading home-rowfill" data-texture={texture} data-metric={metric.id} data-tone={r.tone} {...quotaMeter(r)} style={cssText(tintStyle(spec.tint))}>{@render textureFill()}{@render textureReading()}</div>
  {:else}<div class="home-reading home-texture-half" data-metric={metric.id} data-tone={r.tone} style={cssText(tintStyle(spec.tint))}><div class="home-texture-half-reading">{@render textureReading()}</div>{#if r.value===null}{@render missing(r.value)}{:else}<div {...quotaMeter(r)}>{@render textureFill()}</div>{/if}<MetricExpiries {metric} {...props}/></div>{/if}
 {:else}{@render sourcesItem(metric)}{/if}
{/snippet}
<div class="home-metrics home-variants home-extra" data-style={spec.family==='columns'&&quotas.length>=2?'columns':spec.root}>
 {#if spec.family==='columns'&&quotas.length>=2}
  <div class="home-columns">{#each quotas as metric (metric.id)}{@const r=quotaReading({metric,...props})}<div class="home-column" data-metric={metric.id} data-tone={r.tone}><strong>{r.value===null?'—':r.valueText}</strong><div class="home-column-track" {...quotaMeter(r)}><span class="home-column-fill" style:height={`${r.value===null?0:clamp(r.value)}%`}></span>{#if r.tone==='critical'}<span class="home-column-alert" aria-hidden="true">▲</span>{/if}</div><span class="home-column-name">{r.name}</span>{#if r.value===null}<small>{props.missing}</small>{/if}{@render reset(metric)}</div>{/each}</div>
  {#each metrics.filter(m=>!isQuotaMetric(m)) as metric (metric.id)}{@render row(metric)}{/each}
 {:else}{#each metrics as metric,index (metric.id)}{#if !isQuotaMetric(metric)||spec.family==='columns'||spec.family==='sources'&&!sources.length}{@render row(metric)}{:else}{@render item(metric,index)}{/if}{/each}{/if}
</div>
