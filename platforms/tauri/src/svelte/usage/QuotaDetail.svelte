<script lang="ts">
 import {onMount} from 'svelte';
 import {X} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import type {Metric} from '../../desktop';
 import {preciseQuotaReading,quotaCycle,quotaPercent} from '../../homeUsage';
 import {providerText} from '../../providerText';
 import type {ReadingProps} from './types';
 import QuotaPart from './QuotaPart.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 let {id,metric,onClose,...props}:ReadingProps&{id:string;metric:Metric;onClose:()=>void}=$props();
 let ref:HTMLElement;
 const r=$derived(preciseQuotaReading({metric,...props})),cycle=$derived(quotaCycle(metric,props.now));
 const tr=(key:string)=>providerText(key,props.language),format=(value:number|null)=>value===null?props.missing:quotaPercent(value,props.language);
 onMount(()=>{ref.focus({preventScroll:true});ref.scrollIntoView({block:'nearest'});});
</script>
<section bind:this={ref} {id} class="hq-detail" aria-labelledby={`${id}-title`} tabindex="-1">
 <header><h3 id={`${id}-title`}>{r.name} · {tr('Quota Details')}</h3><Button size="sm" variant="ghost" aria-label={tr('Close Quota Details')} onclick={onClose}><X size={16} aria-hidden="true"/></Button></header>
 <dl>
  <div><dt>{tr('Used')}</dt><dd>{format(r.used)}</dd></div>
  <div><dt>{tr('Remaining')}</dt><dd>{format(r.used===null?null:100-r.used)}</dd></div>
  <div><dt>{tr('Cycle Elapsed')}</dt><dd>{format(cycle.elapsed===null?null:Math.round(cycle.elapsed*10)/10)}</dd></div>
  <div><dt>{tr('Reset Time')}</dt><dd>{#if !metric.hasData}{props.missing}{:else if cycle.endsAt===null}<QuotaPart part="reset" {metric} {...props}/>{:else}<time datetime={new Date(cycle.endsAt).toISOString()}>{new Date(cycle.endsAt).toLocaleString(props.language)}</time>{/if}</dd></div>
 </dl><QuotaPart part="status" {r} missing={props.missing}/><MetricExpiries {metric} language={props.language}/>
</section>
