<script lang="ts">
 import {point,arcPath,clamp,type Reading} from './types';
 import ScaleTicks from './ScaleTicks.svelte';
 let {r,remaining=false}:{r:Reading;remaining?:boolean}=$props();
 const angle=$derived(-130+260*clamp(r.value??0)/100),end=$derived(point(angle,52)),tail=$derived(point(angle,-7));
 const a=$derived(point(-130+260*(remaining?20:80)/100,60)),b=$derived(point(-130+260*(remaining?20:80)/100,73));
</script>
<svg viewBox="0 0 160 145" aria-hidden="true" focusable="false">
 <path d={arcPath(-130,130,73)} class="hq-instrument-rim"/><ScaleTicks/><path d={arcPath(-130,130,55)} class="hq-instrument-inner"/>
 <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class="hq-instrument-boundary"/>
 {#if r.value!==null}<path d={arcPath(-130,-130+260*clamp(r.value)/100,73)} class="hq-instrument-sweep" data-zero={clamp(r.value)===0}/><line x1={tail.x} y1={tail.y} x2={end.x} y2={end.y} class="hq-instrument-needle" data-needle-value={clamp(r.value)}/><circle cx="80" cy="80" r="4" class="hq-instrument-hub"/>{/if}
 <text x="15" y="137" class="hq-instrument-label">0</text><text x="145" y="137" text-anchor="end" class="hq-instrument-label">100</text>
</svg>
