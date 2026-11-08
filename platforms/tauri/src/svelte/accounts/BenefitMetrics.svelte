<script lang="ts">
 import * as Collapsible from '@valar/svelte-ui/collapsible';
 import {Button} from '@valar/svelte-ui/button';
 import {ChevronDown} from '@lucide/svelte';
 import {metricName, metricAmount, type MetricRowProps} from '../../metric';
 import type {Metric} from '../../desktop';
 import {textFor} from '../../copy';
 import MetricRow from '../usage/MetricRow.svelte';
 let {metrics, language, missing, now, remaining}: Omit<MetricRowProps, 'metric'> & {metrics: Metric[]} = $props();
 let opened = $state<Record<string, boolean>>({});
</script>

<div class="benefit-expandables">
 {#each metrics as m (m.id)}
  {#if !m.expiries.length}<MetricRow metric={m} {now} {missing} {language} {remaining}/>
  {:else}<Collapsible.Root class="benefit-expiry-card" data-benefit={m.id} bind:open={() => opened[m.id] ?? false, value => { opened[m.id] = value; }} onkeydown={event => {
   if (event.key !== 'Escape' || !opened[m.id]) return;
   event.preventDefault(); event.stopPropagation(); opened[m.id] = false;
   event.currentTarget.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus({preventScroll: true});
  }}>
   <Collapsible.Trigger>{#snippet child({props})}<Button {...props} variant="ghost" class="benefit-expiry-trigger"><span>{metricName(m, language)} · {metricAmount(m, language, missing)}</span><ChevronDown size={15} aria-hidden="true"/></Button>{/snippet}</Collapsible.Trigger>
   <Collapsible.Content><div class="benefit-dates"><p>{textFor(language).expires} · {m.expiries.length}</p><ul>{#each m.expiries as date, i (i)}<li><time datetime={date}>{new Date(date).toLocaleString(language, {dateStyle: 'medium', timeStyle: 'short'})}</time></li>{/each}</ul></div></Collapsible.Content>
  </Collapsible.Root>{/if}
 {/each}
</div>

<style>
 :global(.benefit-expiry-card) { border: 1px solid var(--border); border-radius: var(--radius); }
 :global(.benefit-expiry-trigger) { width: 100%; justify-content: space-between; white-space: normal; text-align: start; }
 .benefit-dates { padding: .75rem; }
</style>
