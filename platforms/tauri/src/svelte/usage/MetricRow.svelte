<script lang="ts">
 import {TextureFill} from '@valar/svelte-ui/texture-fill';
 import type {MetricRowProps} from '../../metric';
 import {metricName,metricScope,isQuotaMetric,metricAmount,usageTone,windowDescription} from '../../metric';
 import {period} from '../../usage';
 import {providerText} from '../../providerText';
 import {tintStyle,type Texture,type Tint} from '../../texture';
 import {cssText} from './types';
 import MetricReset from './MetricReset.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 let {metric:m,now,missing,language,remaining=false,texture,tint='provider'}:MetricRowProps&{texture?:Texture|'solid';tint?:Tint}=$props();
 const name=$derived(metricName(m,language)),bounded=$derived(isQuotaMetric(m));
 const orb=$derived(m.label==='Orb Usage'&&!period(m.periodSeconds));
 const scope=$derived(bounded&&!orb?providerText(metricScope(m),language):'');
 const max=$derived(Math.max(1,...m.chart.map(p=>p.value)));
 const points=$derived(m.chart.map((p,i)=>`${i*180/Math.max(1,m.chart.length-1)},${26-p.value/max*22}`).join(' '));
</script>
{#if m.chart.length}
 <div class="metric-chart"><span>{name}</span><svg viewBox="0 0 180 28" role="img" aria-label={name}>{#if m.chart.length===1}<circle cx="90" cy={26-m.chart[0].value/max*22} r="2" fill="currentColor"/>{:else}<polyline {points} fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>{/if}</svg></div>
{:else}
 <div class="metric-block"><div class={`metric ${bounded?'':'text-metric'}`} data-tone={!m.hasData||m.percent==null?'normal':usageTone(m.percent,remaining)} style={texture?cssText(tintStyle(tint)):undefined}>
  <span class="metric-name" title={windowDescription(m.periodSeconds,language)}>{orb?'Orb':bounded?period(m.periodSeconds)||'—':name}</span>
  {#if bounded}<div class="metric-meter">{#if scope}<span class="metric-scope">{scope}</span>{/if}
   {#if texture&&m.hasData&&m.percent!=null}<span class="metric-texture" role="meter" aria-label={`${name} · ${providerText(remaining?'Remaining':'Used',language)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.max(0,Math.min(100,m.percent))} aria-valuetext={`${Math.round(m.percent)}%`}><TextureFill class="metric-texture-fill" value={Math.max(0,Math.min(100,m.percent))} {texture} intro/></span>
   {:else}<progress aria-label={`${name} · ${providerText(remaining?'Remaining':'Used',language)}`} aria-valuetext={!m.hasData||m.percent==null?missing:undefined} max={100} value={m.hasData?Math.max(0,Math.min(100,m.percent??0)):0}></progress>{/if}
  </div><span class="value">{m.hasData&&m.percent!=null?`${Math.round(m.percent)}%`:'—'}</span>
  {:else}<span class="amount">{metricAmount(m,language,missing)}</span>{/if}
  {#if bounded}<MetricReset metric={m} {now} {missing} {language}/>{/if}
 </div><MetricExpiries metric={m} {language}/></div>
{/if}
