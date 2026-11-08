<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {ChevronRight, Plus, Minus} from '@lucide/svelte';
 import {metricName} from '../../metric';
 import {trayAccounts, type DesktopState, type Request, type Metric} from '../../desktop';
 import type {Copy} from '../../copy';
 import {trayTrends, type TokenTrend} from '../../trayTrend';
 import Group from '../Group.svelte';
 import SelectField from '../SelectField.svelte';
 import ToggleRow from '../ToggleRow.svelte';
 import TrayGlyph from './TrayGlyph.svelte';
 let {state, t, tr, language, now, disabled, change, openAccounts}: {state: DesktopState; t: Copy; tr: (s: string) => string; language: string; now: number; disabled: boolean; change: (request: Request) => Promise<boolean>; openAccounts: () => void} = $props();
 const MAX_PINNED = 3;
 const shown = $derived(trayAccounts(state.accounts)), enabled = $derived(state.accounts.filter(a => a.enabled));
 const trends = $derived(state.settings.trayStyle === 'sparkline' ? trayTrends(state.accounts, now) : new Map<string, TokenTrend>());
 const percentOnly = (metrics: {percent: number | null; unit: string}[]) => metrics.every(m => m.percent != null || m.unit === 'percent');
 const pinnedOf = (a: DesktopState['accounts'][number]) => a.metrics.filter(m => m.pinned).slice(0, MAX_PINNED);
 const threeRings = $derived(state.settings.trayStyle === 'ring' && shown.some(a => { const p = pinnedOf(a); return p.length === MAX_PINNED && percentOnly(p); }));
 const values = $derived(state.settings.trayStyle === 'ring' && shown.some(a => { const p = pinnedOf(a); return p.length > 0 && !percentOnly(p); }));
 const sample = (percent: number): Pick<Metric, 'percent' | 'hasData' | 'amount' | 'unit'> => ({percent, hasData: true, amount: null, unit: 'percent'});
</script>

<Group title={tr('Menu Bar')}>
 <div class="menu-bar-preview" aria-label={tr('Menu Bar Preview')}>
  {#each shown as a (a.id)}<TrayGlyph family={a.family} badge={a.badge} metrics={pinnedOf(a)} style={state.settings.trayStyle} position={state.settings.ringIconPosition} trend={trends.get(a.id)} tokensLabel={tr('tokens')}/>{/each}
  {#if !shown.length}<span class="muted">{tr('No accounts are shown in the menu bar yet.')}</span>{/if}
 </div>
 {#if threeRings || values}<p class="menu-bar-hint">{tr(threeRings ? 'Three rings use the left icon layout.' : 'Metrics without a percentage are shown as values.')}</p>{/if}
 {#if state.settings.trayStyle === 'sparkline'}<div class="menu-bar-trend-help"><p>{tr('The line shows recorded daily tokens over the last 14 days, including today. The top value is today’s tokens; your selected current readings stay below.')}</p><p>{tr('Missing days stay blank. Without recent records, only selected values appear. Device history appears once per provider. An asterisk marks partial or invalid history.')}</p>{#if Array.from(trends.values()).some(trend => trend.invalid)}<p role="status">{tr('Invalid or duplicate token records are omitted.')}</p>{/if}</div>{/if}
 <SelectField label={tr('Menu Bar Style')} value={state.settings.trayStyle} {disabled} options={[{value: 'ring', label: t.ring}, {value: 'percentage', label: t.percentage}, {value: 'sparkline', label: tr('Token Trend + Values')}]} onValueChange={value => void change({method: 'settings', value: {trayStyle: value}})}/>
 {#if state.settings.trayStyle === 'ring'}<div class="ring-layout-picker"><div class="ring-layout-options" role="group" aria-label={tr('Icon Position')}>
  {#each ['inside', 'left'] as position}<Button variant="secondary" class="ring-layout-option" aria-pressed={state.settings.ringIconPosition === position} {disabled} onclick={() => void change({method: 'settings', value: {ringIconPosition: position}})}><span class="ring-layout-card-content"><TrayGlyph family="claude" {position} metrics={(position === 'inside' ? [65, 35] : [65, 40, 20]).map(sample)}/><span>{tr(position === 'inside' ? 'Inside the Ring' : 'Left of the Rings')}</span></span></Button>{/each}
 </div></div>{/if}
 {#if enabled.length > 0}<div class="menu-bar-accounts"><div class="menu-bar-accounts-heading"><h3>{tr('Accounts in the Menu Bar')}</h3><span>{tr('Up to three metrics each')}</span></div>
  {#each enabled as a (a.id)}
   {@const label = a.email ? `${a.name} · ${a.email}` : a.name}
   {@const pinnable = a.metrics.filter(m => m.pinnable)}
   {@const count = a.metrics.filter(m => m.pinned).length}
   <div class="menu-bar-account" data-on={a.tray}>
    <ToggleRow {label} checked={a.tray} {disabled} onCheckedChange={value => void change({method: 'tray', accountId: a.id, value})}/>
    {#if a.tray}{#if pinnable.length}<div class="metric-chips" role="group" aria-label={`${label} · ${tr('Menu Bar')}`}>
     {#each pinnable as m (m.id)}<Button size="sm" variant="secondary" type="button" class="metric-chip" aria-pressed={m.pinned} disabled={disabled || !m.pinned && count >= MAX_PINNED} onclick={() => void change({method: 'metric', accountId: a.id, metricId: m.id, value: {pinned: !m.pinned}})} aria-label={`${tr(m.pinned ? 'Remove' : 'Add')} · ${metricName(m, language)}`}>{#if m.pinned}<Minus size={13} aria-hidden="true"/>{:else}<Plus size={13} aria-hidden="true"/>{/if}{metricName(m, language)}</Button>{/each}
    </div>{:else}<p class="menu-bar-account-note">{tr('No usage metrics are available yet.')}</p>{/if}{/if}
   </div>
  {/each}
  <div class="linked-setting"><span>{tr('Same order as Subscription Management')}</span><Button size="sm" variant="ghost" onclick={openAccounts}>{tr('Adjust Order')}<ChevronRight size={14} aria-hidden="true"/></Button></div>
 </div>{/if}
</Group>
