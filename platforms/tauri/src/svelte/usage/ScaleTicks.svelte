<script lang="ts">
 import {point} from './types';
 let {start=-130,span=260,radius=68,count=41,cx=80,cy=80}:{start?:number;span?:number;radius?:number;count?:number;cx?:number;cy?:number}=$props();
</script>
<g class="hq-scale-ticks">{#each Array.from({length:count}) as _,i (i)}
 {@const a=start+span*i/(count-1)}{@const major=i%5===0}{@const from=point(a,radius-(major?7:3),cx,cy)}{@const to=point(a,radius,cx,cy)}
 <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} data-major={major}/>
{/each}</g>
