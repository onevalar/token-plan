<script lang="ts">
 import {Ellipsis} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {Switch} from '@valar/svelte-ui/switch';
 import * as DropdownMenu from '@valar/svelte-ui/dropdown-menu';
 import {ConfirmAction} from '@valar/svelte-ui/confirm-action';
 import {providerText} from '../providerText';
 import type {DesktopState, Send} from '../desktop';
 import type {Copy} from '../copy';
 import type {AccountSetups} from './preferences.svelte';
 import ProviderLogo from './ProviderLogo.svelte';
 import SortHandle from './accounts/SortHandle.svelte';
 import PendingAccounts from './accounts/PendingAccounts.svelte';
 import {createChange} from './settings/change.svelte';
 let {platform, state: desktopState, send, t, busy, language, setups, resume}: {platform: string; state: DesktopState; send: Send; t: Copy; busy: boolean; language: string; setups: AccountSetups; resume: (id: string) => void} = $props();
 const tr = (s: string) => providerText(s, language);
 let reordering = $state(false), moving = $state(false), removing = $state<string | null>(null), previewOrder = $state<string[] | null>(null);
 const changes = createChange(() => send, () => t.failed), disabled = $derived(busy || changes.pending || moving);
 const records = $derived(desktopState.accounts.filter(a => a.enabled || a.added));
 const active = $derived(previewOrder ? previewOrder.flatMap(id => records.filter(a => a.id === id)).concat(records.filter(a => !previewOrder!.includes(a.id))) : records);
 async function move(id: string, target: string) {
  const next = active.find(a => a.id === target); if (!next) return;
  const direction = desktopState.accounts.indexOf(next) > desktopState.accounts.findIndex(a => a.id === id) ? 1 : -1;
  const distance = Math.abs(desktopState.accounts.indexOf(next) - desktopState.accounts.findIndex(a => a.id === id));
  const order = active.map(a => a.id), from = order.indexOf(id), to = order.indexOf(target); order.splice(to, 0, order.splice(from, 1)[0]);
  previewOrder = order; moving = true;
  try { for (let i = 0; i < distance; i++) if (!await changes.change({method: 'move', accountId: id, value: direction})) break; }
  finally { previewOrder = null; moving = false; }
 }
</script>

<div class="service-configuration">
 {#if changes.error}<p class="inline-error" role="alert">{changes.error}</p>{/if}
 <div class="section-heading"><h2>{tr('My Accounts')} <span class="muted">{active.length}</span></h2>{#if active.length > 1}<Button size="sm" variant="ghost" onclick={() => { reordering = !reordering; }}>{tr(reordering ? 'Done' : 'Reorder')}</Button>{/if}</div>
 <p class="group-description">{tr(platform === 'macos' ? 'Choose which accounts appear on Home. The same order is used in the menu bar.' : 'Choose which accounts appear on Home. Hidden accounts stay in this list.')}</p>
 <div class="configured-accounts" data-sort-list>
  {#each active as a (a.id)}<div class="managed-account" data-sort-id={a.id}><div class="configured-account">
   <div class="account-entry"><ProviderLogo family={a.family}/><span class="record-label">{a.name}{#if a.email}<small>{a.email}</small>{/if}{#if a.note}<small>{a.note}</small>{/if}</span></div>
   {#if reordering}<SortHandle id={a.id} label={`${tr('Drag to Reorder')} · ${a.email || a.name}`} {disabled} onMove={target => void move(a.id, target)}/>{:else}<Switch aria-label={`${t.enabled} ${a.name} ${a.email}`} checked={a.enabled} {disabled} onCheckedChange={value => void changes.change({method: 'enabled', accountId: a.id, value})}/>{/if}
   {#if !reordering}<DropdownMenu.Root><DropdownMenu.Trigger>{#snippet child({props})}<Button {...props} variant="ghost" size="icon-sm" aria-label={`${tr('Account Actions')} · ${a.email || a.name}`}><Ellipsis size={16}/></Button>{/snippet}</DropdownMenu.Trigger><DropdownMenu.Content><DropdownMenu.Item onSelect={() => { removing = a.id; }}>{t.remove}</DropdownMenu.Item></DropdownMenu.Content></DropdownMenu.Root>{/if}
  </div>{#if removing === a.id}<div class="subscription-remove"><p class="group-description">{t.removePrompt}</p><ConfirmAction fullWidth label={t.remove} defaultState="confirming" prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} {disabled} onCancel={() => { removing = null; }} onConfirm={async () => { await send({method: 'remove', accountId: a.id}); removing = null; }}/></div>{/if}</div>{/each}
 </div>
 <PendingAccounts {setups} {t} {language} busy={disabled} {resume}/>
 {#if !active.length && !setups.records.length}<p class="empty-state">{tr('No accounts yet. Add one to start tracking your usage.')}</p>{/if}
</div>
