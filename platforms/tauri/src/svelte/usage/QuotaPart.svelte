<script lang="ts">
 import type {Snippet} from 'svelte';
 import {ChevronRight,TriangleAlert} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {providerText} from '../../providerText';
 import {quotaMeter} from '../../homeUsage';
 import type {Metric} from '../../desktop';
 import type {Reading,Disclosure} from './types';
 import {clamp} from './types';
 import MetricRow from './MetricRow.svelte';
 import MetricReset from './MetricReset.svelte';
 let {part,r,metric,selected=null,detailId='',onSelect,language='en',now=0,missing='',remaining,small=false,class:className='',children,value=null,count=100,shape='round',columns=10}:{
  part:'label'|'value'|'status'|'reset'|'meter'|'amount'|'track'|'cells';r?:Reading;metric?:Metric;selected?:Disclosure['selected'];detailId?:string;onSelect?:Disclosure['onSelect'];language?:string;now?:number;missing?:string;remaining?:boolean;small?:boolean;class?:string;children?:Snippet;value?:number|null;count?:number;shape?:'round'|'slash';columns?:number;
 }=$props();
 const id=$props.id();
</script>
{#if part==='label'&&metric&&r}
 <Button variant="ghost" class="hq-metric-label h-auto shrink justify-start whitespace-normal" data-open-metric={metric.id} aria-label={providerText('View %@ Quota Details',language).replace('%@',r.name)} aria-controls={selected===metric.id?detailId:undefined} aria-expanded={selected===metric.id} onclick={event=>onSelect?.(metric!.id,event.currentTarget as HTMLButtonElement)}><span>{r.name}</span><ChevronRight size={14} aria-hidden="true"/></Button>
{:else if part==='value'&&r}
 <span class={`hq-value${small?' hq-value-small':''}`} data-quota-value={r.value??'unknown'}>{#if r.value===null}—{:else}{r.valueText.slice(0,-1)}<small>%</small>{/if}</span>
{:else if part==='status'&&r}
 {#if r.warning}<span class="hq-warning"><TriangleAlert size={12} aria-hidden="true"/>{r.warning}</span>{:else if r.value===null}<span class="hq-missing">{missing}</span>{/if}
{:else if part==='reset'&&metric?.hasData}
 <span class="hq-reset"><MetricReset {metric} {now} {missing} {language}/></span>
{:else if part==='meter'&&r}
 <div class={`hq-meter ${className}`} {...quotaMeter(r)} data-empty={r.value===null}>{@render children?.()}</div>
{:else if part==='amount'&&metric}
 <div class="hq-amount" data-kind="amount" data-metric={metric.id}><MetricRow {metric} {now} {missing} {language} {remaining}/></div>
{:else if part==='track'}
 <div class="hq-track" data-unknown={value===null} aria-hidden="true">{#if value!==null}<span style:transform={`scaleX(${clamp(value)/100})`}></span>{/if}</div>
{:else if part==='cells'&&value!==null}
 <div class="hq-cells" data-cell-shape={shape} style:grid-template-columns={`repeat(${columns},minmax(0,1fr))`} aria-hidden="true" data-cell-group={id}>
  {#each Array.from({length:count}) as _,i (i)}<i><span style:transform={`scaleX(${Math.max(0,Math.min(1,value/(100/count)-i))})`}></span></i>{/each}
 </div>
{/if}
