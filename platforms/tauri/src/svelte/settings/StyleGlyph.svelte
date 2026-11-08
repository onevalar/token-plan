<script lang="ts">
 import type {HomeUsageFamily} from '../../homeUsage';
 let {style}: {style: HomeUsageFamily} = $props();
</script>
<svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">
 {#if style === 'bars'}
  {#each [25, 13] as width, i}<rect x="2" y={6 + i * 8} width="36" height="4" rx="2" fill="currentColor" opacity=".2"/><rect x="2" y={6 + i * 8} {width} height="4" rx="2" fill="currentColor"/>{/each}
 {:else if style === 'gauges'}
  <path d="M4 19a9 9 0 0 1 18 0M25 19a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" opacity=".2" stroke-width="3" stroke-linecap="round"/><path d="M4 19a9 9 0 0 1 14-7.5M25 19a6.5 6.5 0 0 1 4-6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
 {:else if style === 'cells'}
  {#each Array.from({length: 10}) as _, i}<rect x={4 + i % 5 * 7} y={i < 5 ? 5 : 13} width="5" height="5" rx="1" fill="currentColor" opacity={i % 5 < (i < 5 ? 4 : 2) ? 1 : .2}/>{/each}
 {:else if style === 'rings'}
  {#each [9.5, 5] as radius, i}<circle cx="20" cy="12" r={radius} fill="none" stroke="currentColor" opacity=".2" stroke-width="2.5"/><circle cx="20" cy="12" r={radius} fill="none" stroke="currentColor" stroke-width="2.5" pathLength="100" stroke-dasharray={`${i ? 31 : 68} 100`} transform="rotate(-90 20 12)"/>{/each}
 {:else if style === 'ruler'}
  <path d="M2 15h36" stroke="currentColor" opacity=".2" stroke-width="2"/><path d="M2 15h26" stroke="currentColor" stroke-width="2"/>{#each [2, 11, 20, 29, 38] as x}<path d={`M${x} 18v3`} stroke="currentColor" opacity=".5"/>{/each}<path d="M28 11l-3-4h6z" fill="currentColor"/>
 {:else if style === 'numbers'}<text x="20" y="17" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">68%</text>
 {:else if style === 'vessel'}<rect x="5" y="7" width="27" height="11" rx="3" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="33" y="10.5" width="3" height="4" rx="1" fill="currentColor"/><rect x="7.5" y="9.5" width="16" height="6" rx="1.5" fill="currentColor"/>
 {:else if style === 'frame'}<rect x="5" y="4" width="30" height="16" rx="5" fill="none" stroke="currentColor" opacity=".2" stroke-width="2.5"/><rect x="5" y="4" width="30" height="16" rx="5" fill="none" stroke="currentColor" stroke-width="2.5" pathLength="100" stroke-dasharray="68 100"/>
 {:else if style === 'sources'}{#each [0, 1, 2] as i}<rect x={2 + [0, 16, 25][i]} y="9" width={[15, 8, 6][i]} height="6" fill="currentColor" opacity={[1, .6, .35][i]}/>{/each}<rect x="33" y="9" width="5" height="6" fill="currentColor" opacity=".12"/>
 {:else if style === 'columns'}{#each [14, 8, 18] as h, i}<rect x={6 + i * 11} y="3" width="7" height="18" rx="2" fill="currentColor" opacity=".2"/><rect x={6 + i * 11} y={21 - h} width="7" height={h} rx="2" fill="currentColor"/>{/each}
 {:else if style === 'signal'}{#each [0, 1, 2] as i}<circle cx={10 + i * 10} cy="12" r="4" fill="currentColor" opacity={i === 0 ? 1 : .2}/>{/each}
 {:else if style === 'texturebar'}<rect x="2" y="9" width="17" height="6" rx="2" fill="currentColor"/>{#each [21, 24, 27, 30, 33, 36] as x}<rect {x} y="9" width="1.2" height="6" fill="currentColor" opacity=".45"/>{/each}
 {:else if style === 'instrument'}<path d="M8 19a13 13 0 1 1 24 0" fill="none" stroke="currentColor" opacity=".35" stroke-width="1.5"/><path d="M20 16l8-9" stroke="currentColor" stroke-width="2"/><circle cx="20" cy="16" r="2" fill="currentColor"/>{#each [9, 20, 31] as x, i}<path d={`M${x} ${i === 1 ? 1 : 7}v3`} stroke="currentColor"/>{/each}
 {:else if style === 'cycle'}<rect x="2" y="4" width="36" height="16" rx="8" fill="none" stroke="currentColor" opacity=".25" stroke-width="2"/><rect x="2" y="4" width="36" height="16" rx="8" fill="none" stroke="currentColor" stroke-width="2" pathLength="100" stroke-dasharray="64 100"/><rect x="6" y="8" width="28" height="8" rx="4" fill="none" stroke="currentColor" opacity=".6" stroke-dasharray="1 2"/>{/if}
</svg>
