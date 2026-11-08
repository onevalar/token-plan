<script lang="ts">
 import {tick, untrack} from 'svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {ChevronRight} from '@lucide/svelte';
 import {providerTheme} from '../providerTheme';
 import {connectionAction} from '../connection';
 import {metricName} from '../metric';
 import {providerText} from '../providerText';
 import type {Account, Send} from '../desktop';
 import type {Copy} from '../copy';
 import {problemAction, modelShares} from './Dashboard.svelte';
 import HomeMetrics from './usage/HomeMetrics.svelte';
 import HistorySummary from './history/HistorySummary.svelte';
 import AccountConfiguration, {type AccountDraft} from './accounts/AccountConfiguration.svelte';
 import BenefitMetrics from './accounts/BenefitMetrics.svelte';
 import HomeMetricEditor from './accounts/HomeMetricEditor.svelte';
 import AccountOnboarding from './accounts/AccountOnboarding.svelte';
 import type {HomeUsageStylePreference} from './preferences.svelte';
 let {account, usageStylePreference, onSetupChange, focusManagement, editing, onEditing, history, send, t, busy, language, now, remaining, missing, retry, draft, onDraftChange}: {account: Account; usageStylePreference: HomeUsageStylePreference; onSetupChange: () => Promise<void>; focusManagement?: boolean; editing: boolean; onEditing: (editing: boolean) => void; history: (range: string) => void; send: Send; t: Copy; busy: boolean; language: string; now: number; remaining: boolean; missing: string; retry: (id: string) => void; draft: AccountDraft; onDraftChange: (patch: AccountDraft) => void} = $props();
 const tr = (s: string) => providerText(s, language);
 let range = $state('30'), root = $state<HTMLDivElement | null>(null), management = $state<HTMLDivElement | null>(null), keyRequest = $state(0);
 let wasEditing = false;
 $effect(() => {
  const active = editing; let current = true;
  void tick().then(() => { if (!current) return; if (active) { root?.closest('.preview-page')?.scrollTo(0, 0); root?.querySelector<HTMLElement>('.home-metric-editor')?.focus({preventScroll: true}); } else if (wasEditing) root?.querySelector<HTMLButtonElement>('.edit-home-button')?.focus(); wasEditing = active; });
  return () => { current = false; };
 });
 function requestKey() { management?.scrollIntoView({block: 'start'}); keyRequest++; }
 $effect(() => { if (focusManagement) untrack(requestKey); });
 const metrics = $derived(account.metrics.filter(m => m.placement !== 'hidden' && !/(?:^|\.)(today|yesterday|last30|trend)$/.test(m.id)));
 const quota = $derived(metrics.filter(m => m.unit === 'percent' || m.percent != null || m.periodSeconds != null));
 const other = $derived(metrics.filter(m => !quota.includes(m)));
 const nextStep = $derived.by(() => { const action = problemAction(account, {open: () => {}, settings: requestKey, retry}); return action && ['Set API Key', 'Try Again'].includes(action.label) ? action : null; });
 const quotaDisplay = $derived(quota.map(m => ({...m, expiries: [], percent: m.unit === 'percent' && !m.hasData ? 0 : m.percent})));
 const theme = $derived(Object.entries(providerTheme(account.family)).map(([key, value]) => `${key}:${value}`).join(';'));
</script>

<div bind:this={root} class="account-detail" data-provider={account.family} style={theme}>
 {#if account.email || account.plan}<div class="detail-identity">{#if account.email}<span>{account.email}</span>{/if}{#if account.plan}<span class="plan-tag">{account.plan}</span>{/if}</div>{/if}
 {#if !editing && ['inspect', 'login'].includes(connectionAction(account)) && ['claude', 'codex'].includes(account.family)}<AccountOnboarding {onSetupChange} {send} {busy} {language} family={account.family} loginDirectories={account.loginDirectories} targetId={account.id}/>{/if}
 {#if editing}<HomeMetricEditor {usageStylePreference} {account} {send} {t} {busy} {language}/>
 {:else}<div>
  {#if account.error}<div class="notice-block detail-notice"><p role="status" class="inline-error">{tr(account.error)}</p>{#if nextStep}<Button size="sm" variant="secondary" class="notice-action" disabled={busy} onclick={nextStep.run}>{tr(nextStep.label)}</Button>{/if}</div>{:else if account.warning}<p role="status" class="group-description">{tr(account.warning)}</p>{/if}
  {#if quota.length > 0}<section class="detail-group"><h2>{tr('Current Quota')}</h2><HomeMetrics metrics={quotaDisplay} style={usageStylePreference.styleFor(account.id)} sources={modelShares(account.history)} {now} {missing} {language} {remaining}/>{#each quota.filter(m => m.expiries.length > 0) as m (m.id)}<details class="expiry-details"><summary>{metricName(m, language)} · {t.expires} · {m.expiries.length}</summary><ul>{#each m.expiries as date, i (i)}<li>{new Date(date).toLocaleString(language, {dateStyle: 'medium', timeStyle: 'short'})}</li>{/each}</ul></details>{/each}</section>{/if}
  {#if other.length > 0}<section class="detail-group"><h2>{tr('Balance and Benefits')}</h2><BenefitMetrics metrics={other} {now} {missing} {language} {remaining}/></section>{/if}
  <section class="detail-group history-overview"><div class="section-heading"><h2>{t.history}</h2><Button variant="ghost" size="sm" onclick={() => history(range)}>{tr('View History')}<ChevronRight size={15}/></Button></div><HistorySummary accounts={[account]} {t} {language} {range} onRange={value => { range = value; }}/></section>
  <div bind:this={management}><AccountConfiguration {draft} {onDraftChange} {account} {send} {t} {busy} {language} onEditHome={account.metrics.length > 0 ? () => onEditing(true) : undefined} focusKey={keyRequest}/></div>
 </div>{/if}
</div>
