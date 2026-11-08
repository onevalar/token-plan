<script lang="ts">
 import {Clock3} from '@lucide/svelte';
 import {isQuotaMetric} from '../../metric';
 import {preciseQuotaReading,quotaPercent} from '../../homeUsage';
 import {providerText} from '../../providerText';
 import {arcPath,clamp,metricAttributes,type DesignProps} from './types';
 import QuotaPart from './QuotaPart.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import '../../home-editorial-styles.css';
 let props:DesignProps=$props();
 const tr=(key:string)=>providerText(key,props.language),percent=(value:number)=>quotaPercent(value,props.language);
</script>
<div class="hq-editorial" data-variant={props.variant}>
 {#each props.metrics as metric (metric.id)}
  {#if !isQuotaMetric(metric)}<QuotaPart part="amount" {metric} {...props}/>
  {:else}{@const r=preciseQuotaReading({metric,...props})}
   {#if props.variant===0}<div class="hq-ticket" {...metricAttributes(metric,r)}><div class="hq-ticket-reading"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="value" {r}/><small>{r.mode}</small></div><div class="hq-ticket-reset"><Clock3 size={16} aria-hidden="true"/><QuotaPart part="reset" {metric} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div><QuotaPart part="meter" {r}><QuotaPart part="track" value={r.value}/></QuotaPart><MetricExpiries {metric} {...props}/></div>
   {:else if props.variant===1}
    {@const used=r.used}{@const left=used===null?null:100-used}{@const description=used===null?props.missing:[`${tr('Used')} ${percent(used)}`,`${tr('Remaining')} ${percent(left!)}`,r.warning].filter(Boolean).join(' · ')}
    <div class="hq-spread" {...metricAttributes(metric,r)}><div class="hq-spread-heading"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div><div class="hq-spread-values">
     <div data-emphasized={!props.remaining}><span>{tr('Used')}</span>{#if !props.remaining}<QuotaPart part="value" {r}/>{:else}<span class="hq-secondary-value" data-side="used">{used===null?'—':percent(used)}</span>{/if}</div><span class="hq-spread-divider" aria-hidden="true">/</span>
     <div data-emphasized={props.remaining??false}><span>{tr('Remaining')}</span>{#if props.remaining}<QuotaPart part="value" {r}/>{:else}<span class="hq-secondary-value" data-side="remaining">{left===null?'—':percent(left)}</span>{/if}</div>
    </div><QuotaPart part="meter" r={{...r,value:used,label:`${r.name} · ${tr('Used')}`,description}}><div class="hq-spread-track" data-unknown={used===null} aria-hidden="true">{#if used!==null}<span style:transform={`scaleX(${clamp(used)/100})`}></span>{/if}</div></QuotaPart><QuotaPart part="reset" {metric} {...props}/><MetricExpiries {metric} {...props}/></div>
   {:else}<div class="hq-spine" {...metricAttributes(metric,r)}><div class="hq-spine-words"><QuotaPart part="label" {metric} {r} {...props}/><QuotaPart part="reset" {metric} {...props}/><QuotaPart part="status" {r} missing={props.missing}/></div><div class="hq-spine-value"><QuotaPart part="value" {r}/><small>{r.mode}</small></div><QuotaPart part="meter" {r}><svg viewBox="0 0 56 70" aria-hidden="true" focusable="false"><path d={arcPath(-145,145,23,28,32)} class="hq-chart-track" stroke-width="2"/>{#if r.value!==null&&clamp(r.value)>0}<path d={arcPath(-145,-145+290*clamp(r.value)/100,23,28,32)} class="hq-chart-fill" stroke-width="2"/>{/if}<line x1="28" x2="28" y1="12" y2="52" class="hq-spine-axis"/><line x1="24" x2="32" y1="32" y2="32" class="hq-spine-axis"/></svg></QuotaPart><MetricExpiries {metric} {...props}/></div>{/if}
  {/if}
 {/each}
</div>
