<script lang="ts">
 import {untrack} from 'svelte';
 import {metricName} from '../../metric';
 import {providerText} from '../../providerText';
 import type {Account, Metric, Send} from '../../desktop';
 import type {Copy} from '../../copy';
 import type {HomeUsageStylePreference} from '../preferences.svelte';
 import Group from '../Group.svelte';
 import SelectField from '../SelectField.svelte';
 import SortHandle from './SortHandle.svelte';
 import UsageStylePicker from '../settings/UsageStylePicker.svelte';
 type Placement = Pick<Metric, 'id' | 'placement'>;
 const layoutOf = (rows: Metric[]): Placement[] => rows.map(({id, placement}) => ({id, placement}));
 let {account, send, t, busy, language, usageStylePreference}: {account: Account; send: Send; t: Copy; busy: boolean; language: string; usageStylePreference: HomeUsageStylePreference} = $props();
 const tr = (s: string) => providerText(s, language);
 let rows = $state(untrack(() => account.metrics.map(m => ({...m})))), error = $state('');
 let accepted = untrack(() => layoutOf(rows)), pending: Metric[] | null = null, running = false;
 function apply(next: Metric[]) {
  rows = next; error = ''; pending = next;
  if (running) return; running = true;
  void (async () => {
   try {
    while (pending) {
     const current = pending; pending = null;
     try { await send({method: 'metricLayout', accountId: account.id, value: layoutOf(current)}); accepted = layoutOf(current); }
     catch (e) {
      console.error('Metric layout save failed', e);
      if (!pending) { const latest = new Map(rows.map(row => [row.id, row])); rows = accepted.map(({id, placement}) => { const row = latest.get(id); return row ? {...row, placement} : null; }).filter((row): row is Metric => row !== null); error = t.failed; break; }
     }
    }
   } finally { running = false; }
  })();
 }
 function move(id: string, target: string) { const next = [...rows], from = next.findIndex(m => m.id === id), to = next.findIndex(m => m.id === target); if (from < 0 || to < 0 || from === to) return; next.splice(to, 0, next.splice(from, 1)[0]); apply(next); }
 const place = (id: string, placement: Metric['placement']) => apply(rows.map(row => row.id === id ? {...row, placement} : row));
</script>

<div class="home-metric-editor" tabindex="-1" aria-label={tr('Home Display')}>
 {#if usageStylePreference.mode === 'custom'}<UsageStylePicker {language} value={usageStylePreference.styleFor(account.id)} onChange={style => usageStylePreference.changeAccountStyle(account.id, style)} {tr} disabled={busy}/>{/if}
 <Group title={tr('Home Display')}><div data-sort-list>
  {#each rows as m (m.id)}<div class="placement-row metric-edit-row" data-tray="false" data-sort-id={m.id}><span>{metricName(m, language)}</span><div class="visually-labelled-select"><SelectField label={`${metricName(m, language)} · ${t.placement}`} value={m.placement} disabled={busy} options={(['home', 'details', 'hidden'] as const).map(value => ({value, label: t[value]}))} onValueChange={placement => place(m.id, placement as Metric['placement'])}/></div><SortHandle id={m.id} label={`${tr('Drag to Reorder')} · ${metricName(m, language)}`} disabled={busy} onMove={target => move(m.id, target)}/></div>{/each}
 </div></Group>
 {#if error}<p role="alert" class="inline-error">{error}</p>{/if}
</div>
