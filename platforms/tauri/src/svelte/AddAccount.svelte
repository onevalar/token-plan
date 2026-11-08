<script lang="ts">
 import {untrack} from 'svelte';
 import {ChevronRight} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import ProviderLogo from './ProviderLogo.svelte';
 import InputField from './settings/InputField.svelte';
 import {providerText} from '../providerText';
 import type {Account, DesktopState, Send} from '../desktop';
 import type {Copy} from '../copy';
 import type {AccountSetup} from './preferences.svelte';
 import {createChange} from './settings/change.svelte';
 import AccountOnboarding from './accounts/AccountOnboarding.svelte';
 let {state: desktopState, send, t, busy, language, open, complete, setup, onSetupChange}: {state: DesktopState; send: Send; t: Copy; busy: boolean; language: string; open: (id: string) => void; complete: (name: string) => void; setup?: AccountSetup; onSetupChange: () => Promise<void>} = $props();
 const tr = (s: string) => providerText(s, language);
 let search = $state(''), family = $state<string | null>(untrack(() => setup?.provider ?? null));
 const changes = createChange(() => send, () => t.failed), disabled = $derived(busy || changes.pending);
 const services = $derived(desktopState.accounts.filter((a, i, all) => all.findIndex(b => b.family === a.family) === i));
 const selected = $derived(services.find(a => a.family === family));
 const found = $derived(desktopState.accounts.filter(a => a.family === family && !a.enabled && !a.added));
 const filtered = $derived(services.filter(a => a.name.toLowerCase().includes(search.toLowerCase())));
 const label = (a: Account) => a.email ? `${a.name} · ${a.email}` : a.name;
 const hint = (a: Account) => a.email || tr(a.apiKey ? 'Needs an API key' : a.connection === 'available' ? 'Detected Account' : 'Not detected yet');
 async function add(a: Account) { if (!await changes.change({method: 'enabled', accountId: a.id, value: true})) return; if (a.apiKey) open(a.id); else complete(label(a)); }
</script>

<div class="add-account">
 {#if changes.error}<p class="inline-error" role="alert">{changes.error}</p>{/if}
 {#if !selected}
  <p class="add-intro">{tr('Choose a service to see how to connect an account.')}</p>
  {#if services.length > 6}<div class="service-search"><InputField label={tr('Search Services')} placeholder={tr('Search')} value={search} oninput={e => { search = e.currentTarget.value; }}/></div>{/if}
  <div class="configured-accounts">{#each filtered as a (a.family)}<Button variant="ghost" class="row-button account-entry" {disabled} onclick={() => { family = a.family; }}><ProviderLogo family={a.family}/><span class="record-label">{a.name}</span><ChevronRight size={15}/></Button>{/each}</div>
  {#if !filtered.length}<p class="empty-state">{tr('No Matching Services')}</p>{/if}
 {:else}
  <div class="section-heading"><h2><ProviderLogo family={selected.family}/> {selected.name}</h2><Button size="sm" variant="ghost" {disabled} onclick={() => { family = null; }}>{tr('Change Service')}</Button></div>
  <div class="configured-accounts">{#each found as a (a.id)}<div class="configured-account"><span class="account-entry"><ProviderLogo family={a.family}/><span class="record-label">{a.name}<small>{hint(a)}</small></span></span><Button size="sm" variant="secondary" {disabled} aria-label={`${tr(a.apiKey ? 'Set Up' : 'Add')} ${label(a)}`} onclick={() => void add(a)}>{tr(a.apiKey ? 'Set Up' : 'Add')}</Button></div>{/each}</div>
  {#if !found.length}<p class="group-description">{tr('Existing accounts are in Subscription Management, including accounts hidden from Home.')}</p>{/if}
  {#if ['claude', 'codex'].includes(selected.family)}{#key selected.family}<AccountOnboarding setup={setup?.provider === selected.family ? setup : undefined} {onSetupChange} family={selected.family} {send} busy={disabled} {language} onConnected={accounts => { const added = accounts[0]; if (added) complete(label(added)); }}/>{/key}{/if}
 {/if}
</div>
