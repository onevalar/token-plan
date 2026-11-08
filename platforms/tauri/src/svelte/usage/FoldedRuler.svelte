<script lang="ts">
 import {onMount} from 'svelte';
 import {clamp,type Reading} from './types';
 import QuotaPart from './QuotaPart.svelte';
 let {r}:{r:Reading}=$props();
 let ref:HTMLDivElement,width=$state(280);
 const divisions=Array.from({length:21},(_,i)=>i*5),left=8,top=26,radius=16,bottom=top+radius*2;
 const turnX=$derived(width-44),straight=$derived(turnX-left),bend=Math.PI*radius,total=$derived(straight*2+bend);
 function pointAt(percent:number){
  const distance=total*percent/100;
  if(distance<=straight)return {x:left+distance,y:top,nx:0,ny:-1};
  if(distance>=straight+bend)return {x:turnX-(distance-straight-bend),y:bottom,nx:0,ny:1};
  const angle=(distance-straight)/radius-Math.PI/2;
  return {x:turnX+radius*Math.cos(angle),y:top+radius+radius*Math.sin(angle),nx:Math.cos(angle),ny:Math.sin(angle)};
 }
 const marker=$derived(r.value===null?null:pointAt(clamp(r.value)));
 onMount(()=>{
  const measure=()=>{const measured=ref.getBoundingClientRect().width;if(measured>0)width=measured;};
  measure();const observer=new ResizeObserver(measure);observer.observe(ref);return ()=>observer.disconnect();
 });
</script>
<QuotaPart part="meter" {r} class="hq-rail-fold-meter"><div bind:this={ref} class="hq-rail-fold-scale" aria-hidden="true">
 <svg viewBox={`0 0 ${width} 84`} {width} height="84" focusable="false"><path class="hq-rail-fold-path" d={`M ${left} ${top} H ${turnX} A ${radius} ${radius} 0 0 1 ${turnX} ${bottom} H ${left}`}/>
  {#each divisions as value (value)}{@const p=pointAt(value)}{@const length=value%25===0?7:4}<line class="hq-rail-fold-tick" data-major={value%25===0} x1={p.x} y1={p.y} x2={p.x+p.nx*length} y2={p.y+p.ny*length}/>{/each}
  {#if marker}<circle class="hq-rail-fold-dot" data-rail-marker cx={marker.x} cy={marker.y} r="4.5"/>{/if}
 </svg><span class="hq-rail-fold-start">0 →</span><span class="hq-rail-fold-quarter" style:left={`${pointAt(25).x}px`}>25</span><span class="hq-rail-fold-turn">50<span>↵</span></span><span class="hq-rail-fold-quarter hq-rail-fold-lower" style:left={`${pointAt(75).x}px`}>75</span><span class="hq-rail-fold-end">100 ←</span>
</div></QuotaPart>
