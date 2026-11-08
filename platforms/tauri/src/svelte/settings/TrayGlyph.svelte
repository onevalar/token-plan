<script lang="ts">
 import {StaticSparkline} from '@valar/svelte-ui/sparkline';
 import ProviderLogo from '../ProviderLogo.svelte';
 import logoSizes from '../../tray-logo-sizes.json';
 import type {Metric} from '../../desktop';
 import {tokenReading, type TokenTrend} from '../../trayTrend';
 type TrayMetric = Pick<Metric, 'hasData' | 'percent' | 'amount' | 'unit'>;
 let {family, metrics, badge, style = 'ring', position = 'inside', trend, tokensLabel = 'tokens'}: {family: string; metrics: TrayMetric[]; badge?: number | null; style?: string; position?: string; trend?: TokenTrend; tokensLabel?: string} = $props();
 const selected = $derived(metrics.slice(0, 3));
 const ring = $derived(style === 'ring' && selected.length > 0 && selected.every(m => m.percent != null || m.unit === 'percent'));
 const triple = $derived(ring && selected.length === 3), left = $derived(ring && (position === 'left' || triple));
 const sparkline = $derived(style === 'sparkline' && selected.length > 0 && trend?.values.some(value => value != null) ? trend : undefined);
 const sizes = $derived(logoSizes[family as keyof typeof logoSizes] ?? logoSizes.tokenplan);
 const side = $derived((ring && !left ? sizes[selected.length > 1 ? 1 : 0] : selected.length ? 28 : 32) * .7);
 const reading = (m: TrayMetric) => !m.hasData ? '—' : m.percent != null ? `${Math.round(m.percent)}%` : m.amount != null ? m.amount >= 1000 ? `${Math.round(m.amount / 1000)}k` : String(Math.round(m.amount)) : '—';
</script>

{#snippet rings()}
 <svg class="tray-rings" width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">
  {#each selected as m, i}
   {@const percent = m.hasData ? Math.max(0, Math.min(100, m.percent ?? 0)) : 0}
   <g><circle cx="20" cy="20" r={17.5 - i * 4.5} fill="none" stroke="currentColor" opacity=".32" stroke-width="2.6"/>{#if percent > 0}<circle cx="20" cy="20" r={17.5 - i * 4.5} fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" pathLength="100" stroke-dasharray={`${percent} 100`} transform="rotate(-90 20 20)"/>{/if}</g>
  {/each}
  {#if triple && badge != null}<text class="tray-center-badge" x="20" y="24.5" text-anchor="middle" fill="currentColor" font-size="13" font-weight="600" opacity=".85">{badge <= 9 ? badge : '+'}</text>{/if}
 </svg>
{/snippet}
<span class="tray-glyph" aria-hidden="true" data-layout={left ? 'left' : 'inside'} data-triple={triple}>
 <span class="tray-mark-cell" style={`--mark-side:${side}px`}><ProviderLogo {family}/>{#if ring && !left}{@render rings()}{/if}</span>
 {#if badge != null && !triple}<sup class="tray-badge">{badge <= 9 ? badge : '+'}</sup>{/if}
 {#if left}{@render rings()}{/if}
 {#if sparkline}<StaticSparkline class="tray-sparkline" values={sparkline.values}/><span class="tray-trend-values"><span>{tokenReading(sparkline.values.at(-1) ?? null)} {tokensLabel}{sparkline.partial || sparkline.invalid ? '*' : ''}</span><span>{selected.map(reading).join(' · ')}</span></span>{/if}
 {#if !ring && !sparkline && selected.length > 0}<span class={`tray-values ${selected.length === 3 ? 'three-values' : ''}`}>{#each selected as m}<span>{reading(m)}</span>{/each}</span>{/if}
</span>
