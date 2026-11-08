<script lang="ts" module>
 export type AccountDraft = {note?: string; key?: string};
</script>
<script lang="ts">
 import {untrack} from 'svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {ConfirmAction} from '@valar/svelte-ui/confirm-action';
 import {Pencil, Plus} from '@lucide/svelte';
 import {providerText} from '../../providerText';
 import type {Account, Send} from '../../desktop';
 import type {Copy} from '../../copy';
 import InputField from '../settings/InputField.svelte';
 let {account: a, send, t, busy, language, draft, onDraftChange, onEditHome, focusKey = 0}: {account: Account; send: Send; t: Copy; busy: boolean; language: string; draft: AccountDraft; onDraftChange: (patch: AccountDraft) => void; onEditHome?: () => void; focusKey?: number} = $props();
 const tr = (s: string) => providerText(s, language);
 const note = $derived(draft.note ?? a.note), key = $derived(draft.key ?? '');
 let noteOpen = $state(false), keyOpen = $state(untrack(() => draft.key !== undefined));
 let keyInput = $state<HTMLInputElement | null>(null), noteInput = $state<HTMLInputElement | null>(null);
 const editingNote = $derived(noteOpen || draft.note !== undefined);
 let saving = $state<'note' | 'key' | null>(null), feedback = $state<Partial<Record<'note' | 'key', 'saved' | 'failed'>>>({});
 const savedKey = $derived(a.apiKeyStatus === 'saved' || a.apiKeyStatus === 'overrideActive');
 const keyStatus = $derived(tr(a.apiKeyStatus === 'saved' ? 'Saved' : a.apiKeyStatus === 'overrideActive' ? 'Custom Key' : a.apiKeyStatus === 'fromEnvironment' ? 'From Your Environment' : 'Not Set'));
 $effect(() => { if (focusKey) keyOpen = true; });
 $effect(() => { if (keyOpen) keyInput?.focus(); });
 $effect(() => { if (editingNote) noteInput?.focus(); });
 function edit(field: 'note' | 'key', value: string) { onDraftChange({[field]: value}); feedback = {...feedback, [field]: undefined}; }
 function closeKey() { onDraftChange({key: undefined}); feedback = {...feedback, key: undefined}; keyOpen = false; }
 async function save(field: 'note' | 'key') {
  if (busy || saving || field === 'note' && note === a.note || field === 'key' && !key.trim()) return;
  saving = field; feedback = {...feedback, [field]: undefined};
  try { await send({method: field, accountId: a.id, value: field === 'note' ? note : key}); onDraftChange({[field]: undefined}); if (field === 'note') { feedback = {...feedback, note: 'saved'}; noteOpen = false; } else { feedback = {...feedback, key: undefined}; keyOpen = false; } }
  catch (e) { console.error('Account configuration save failed', e); feedback = {...feedback, [field]: 'failed'}; }
  finally { saving = null; }
 }
</script>

<div class="account-configuration">
 <div class="account-action-fields">
  {#if a.note && !editingNote}<div class="note-row"><div><span class="note-label">{t.note}</span><p>{a.note}</p></div></div>{/if}
  {#if editingNote}<form class="note-editor" onsubmit={e => { e.preventDefault(); void save('note'); }}>
   <InputField label={t.note} value={note} readonly={busy || !!saving} maxlength={2000} bind:ref={noteInput} error={feedback.note === 'failed' ? t.failed : undefined} oninput={e => edit('note', e.currentTarget.value)}/>
   <div class="note-actions"><p class="save-status" role="status">{saving === 'note' ? tr('Saving…') : note !== a.note ? tr('Unsaved Changes') : ''}</p><Button size="sm" variant="ghost" disabled={!!saving} onclick={() => { onDraftChange({note: undefined}); noteOpen = false; }}>{t.cancel}</Button><Button size="sm" variant="secondary" type="submit" disabled={!!saving} aria-busy={saving === 'note'} aria-disabled={busy || note === a.note}>{t.save}</Button></div>
  </form>{/if}
  {#if feedback.note === 'saved' && !editingNote}<p class="save-status" role="status">{t.done}</p>{/if}
  {#if a.apiKey}<div class="api-key-summary"><span class="api-key-name">{['openai', 'anthropic'].includes(a.family) ? tr('Organization Admin Key') : t.key}</span><span class="api-key-status" data-state={a.apiKeyStatus}>{keyStatus}</span>{#if !keyOpen}<Button size="sm" variant="ghost" disabled={busy} onclick={() => { keyOpen = true; }}>{savedKey || a.apiKeyStatus === 'fromEnvironment' ? tr('Replace Key') : tr('Set API Key')}</Button>{/if}</div>{/if}
  {#if ['openai', 'anthropic'].includes(a.family)}<p class="group-description">{tr('Reads organization-wide API usage and costs. Requires an organization Admin key; a model API key is not sufficient.')}</p>{/if}
  {#if a.apiKey && keyOpen}<form class="key-editor" onsubmit={e => { e.preventDefault(); void save('key'); }}>
   <InputField bind:ref={keyInput} label={['openai', 'anthropic'].includes(a.family) ? tr('Organization Admin Key') : t.key} type="password" autocomplete="off" value={key} readonly={busy || !!saving} maxlength={8192} error={feedback.key === 'failed' ? t.failed : undefined} oninput={e => edit('key', e.currentTarget.value)}/>
   <div class="key-editor-actions"><p class="save-status" role="status">{saving === 'key' ? tr('Saving…') : ''}</p><Button size="sm" variant="ghost" disabled={!!saving} onclick={closeKey}>{t.cancel}</Button><Button size="sm" variant="secondary" type="submit" disabled={!!saving} aria-busy={saving === 'key'} aria-disabled={busy || !key.trim()}>{t.save}</Button></div>
  </form>{/if}
 </div>
 <div class="account-action-row">
  {#if onEditHome}<Button class="edit-home-button" size="sm" variant="secondary" disabled={busy} onclick={onEditHome}><Pencil size={15} aria-hidden="true"/>{tr('Edit Home Display')}</Button>{/if}
  {#if !editingNote}<Button class={a.note ? 'note-action' : 'add-note'} size="sm" variant="secondary" disabled={busy} onclick={() => { noteOpen = true; }}>{#if !a.note}<Plus size={14}/>{/if}{a.note ? tr('Edit') : tr('Add Note')}</Button>{/if}
  {#if savedKey}<ConfirmAction class="remove-key-action" fullWidth label={t.clearKey} prompt={tr('Remove?')} confirmLabel={tr('Confirm')} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.save} disabled={busy} onConfirm={async () => { await send({method: 'key', accountId: a.id, value: ''}); closeKey(); }}/>{/if}
 </div>
 {#if a.removable}<section class="danger-zone"><ConfirmAction fullWidth label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={busy} onConfirm={() => send({method: 'remove', accountId: a.id})}/></section>{/if}
</div>
