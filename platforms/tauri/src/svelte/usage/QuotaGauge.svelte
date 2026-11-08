<script lang="ts">
 import {GaugeArc} from '@valar/svelte-ui/gauge';
 import {quotaMeter,quotaReading} from '../../homeUsage';
 let {reading}:{reading:ReturnType<typeof quotaReading>}=$props();
 let probe:HTMLDivElement;
 let outside=$state(false);
 $effect(()=>{
  reading.name;reading.valueText;
  const node=probe;
  const measure=()=>{if(node.clientWidth)outside=node.scrollHeight>node.clientHeight||node.scrollWidth>node.clientWidth;};
  measure();const observer=new ResizeObserver(measure);observer.observe(node);
  for(const child of node.children)observer.observe(child);
  return ()=>observer.disconnect();
 });
</script>
<div class="quota-gauge-tile">
 {#if outside}<div class="quota-title">{reading.name}</div>{/if}
 <div class="quota-gauge" {...quotaMeter(reading)}>
  <svg viewBox="0 0 100 94" aria-hidden="true"><GaugeArc value={reading.value} tone={reading.tone==='critical'?'danger':'accent'} style="--primary:var(--quota-color);--destructive:var(--danger);--border:var(--border-strong)"/></svg>
  <div class="quota-gauge-fit" bind:this={probe} aria-hidden="true"><span>{reading.name}</span><strong>{reading.valueText}</strong></div>
  <div class="quota-gauge-reading">{#if !outside}<span>{reading.name}</span>{/if}<strong>{reading.valueText}</strong></div>
 </div>
</div>
