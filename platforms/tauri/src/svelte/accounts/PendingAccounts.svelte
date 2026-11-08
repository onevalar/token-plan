<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {ConfirmAction} from '@valar/svelte-ui/confirm-action';
 import ProviderLogo from '../ProviderLogo.svelte';
 import {providerText} from '../../providerText';
 import type {Copy} from '../../copy';
 import type {AccountSetups} from '../preferences.svelte';
 let {setups, language, t, busy, resume}: {setups: AccountSetups; language: string; t: Copy; busy: boolean; resume: (id: string) => void} = $props();
 const tr = (s: string) => providerText(s, language);
</script>

<section class="pending-accounts">
 {#if setups.error}<div role="alert"><p class="inline-error">{tr(setups.error)}</p><Button size="sm" variant="ghost" onclick={() => void setups.reload().catch(() => {})}>{tr('Try Again')}</Button></div>{/if}
 {#if setups.records.length > 0}<h2>{tr('Pending Connections')}</h2>{#each setups.records as record (record.id)}<div class="pending-account">
  <div class="account-entry"><ProviderLogo family={record.provider}/><span class="record-label">{record.label || (record.provider === 'claude' ? 'Claude' : 'Codex')}<small>{tr('Not signed in yet')}</small></span></div><code class="configuration-path">{record.directory}</code>
  <div class="pending-actions"><Button size="sm" variant="secondary" disabled={busy} onclick={() => resume(record.id)}>{tr('Continue Setup')}</Button><ConfirmAction label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={busy} onConfirm={() => setups.forget(record.id)}/></div>
 </div>{/each}{/if}
</section>
