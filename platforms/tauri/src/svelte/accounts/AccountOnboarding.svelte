<script lang="ts" module>
 export function sameLoginDirectory(a: string, b: string) {
  const normalize = (s: string) => { s = s.replaceAll('\\', '/').replace(/^\/\/\?\//, '').replace(/\/$/, ''); return /^[a-z]:\//i.test(s) ? s.toLowerCase() : s; };
  return normalize(a) === normalize(b);
 }
</script>
<script lang="ts">
 import {untrack} from 'svelte';
 import {invoke} from '@tauri-apps/api/core';
 import {Check} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import InputField from '../settings/InputField.svelte';
 import {providerText} from '../../providerText';
 import {connectionSummary} from '../../connection';
 import type {Account, Send} from '../../desktop';
 import type {AccountSetup} from '../preferences.svelte';
 type Guide = {command: string; directory: string; opened: boolean; setup?: AccountSetup};
 let {send, busy, language, family, targetId, loginDirectories = [], setup, onSetupChange, onConnected}: {send: Send; busy: boolean; language: string; family: string; targetId?: string; loginDirectories?: string[]; setup?: AccountSetup; onSetupChange?: () => Promise<void>; onConnected?: (accounts: Account[]) => void} = $props();
 const tr = (s: string) => providerText(s, language);
 let pending = $state(false), status = $state(''), error = $state('');
 let guide = $state<Guide | null>(null), record = $state(untrack(() => setup)), label = $state('');
 let advanced = $state(false), directory = $state(''), results = $state<Account[] | null>(null), copied = $state(false), connected = $state(false);
 let running = false;
 const disabled = $derived(busy || pending);
 async function run(action: () => Promise<void>) {
  if (disabled || running) return; running = true; pending = true; error = ''; status = '';
  try { await action(); } catch (e) { console.error('Account connection step failed', e); error = tr(String(e).includes('invalid_directory') ? 'Directory not found or inaccessible. Check the full path and permissions.' : 'Could not complete this step. Check the directory or login and try again.'); }
  finally { running = false; pending = false; }
 }
 async function scan(expectedDirectory = guide?.directory ?? record?.directory) {
  const state = await send({method: 'discover'}); if (!state) throw new Error('missing_detection_result');
  const rows = state.accounts.filter(a => a.family === family && (a.email || a.removable || a.error || a.fetchedAt));
  const match = expectedDirectory ? rows.find(a => a.loginDirectories.some(path => sameLoginDirectory(path, expectedDirectory))) : undefined;
  results = expectedDirectory ? match ? [match] : [] : rows;
  if (match && targetId && match.id !== targetId) { error = tr('Another account is currently connected. This saved account is kept; connect its configuration directory or sign in to it.'); return; }
  if (match) {
   if (!match.enabled) await send({method: 'enabled', accountId: match.id, value: true});
   if (record?.label && !match.note) await send({method: 'note', accountId: match.id, value: record.label});
   if (record) { await invoke('account_setup_remove', {id: record.id}); await onSetupChange?.(); }
   connected = true; status = tr('Account connected.'); onConnected?.([{...match, enabled: true, added: true}]);
  } else status = tr(expectedDirectory ? 'No signed-in account was found in this folder yet. Finish signing in, then check again.' : rows.length ? 'Detection complete.' : 'No matching account was identified. Check the directory and access permissions.');
 }
 const signIn = () => run(async () => {
  let active = record; const existing = targetId ? loginDirectories[0] : undefined;
  if (!active && !existing) { active = await invoke<AccountSetup>('account_setup_create', {provider: family, label}); record = active; await onSetupChange?.(); }
  const path = active?.directory ?? existing!;
  await invoke('account_directory', {provider: family, directory: path});
  copied = false; connected = false; guide = await invoke<Guide>('account_login', {provider: family, directory: path});
 });
</script>

<section class="account-onboarding" aria-label={tr('Connect Account')}>
 <p class="group-description">{tr(targetId ? 'Saved accounts stay here. Detect existing logins first; only sign in again when authorization is required.' : 'Create a separate login folder for this account. Your existing terminal login stays unchanged.')}</p>
 {#if !targetId && !record && !guide}<InputField label={tr('Account Note (Optional)')} value={label} maxlength={120} {disabled} oninput={e => { label = e.currentTarget.value; }}/>{/if}
 {#if record}<div class="setup-directory"><span>{tr('Configuration Directory')}</span><code class="configuration-path">{record.directory}</code></div>{/if}
 {#if !guide}<div class="onboarding-actions"><Button size="sm" variant="secondary" {disabled} aria-busy={pending} onclick={() => void signIn()}>{tr(record || targetId ? 'Open Terminal to Sign In' : 'Create Account and Sign In')}</Button><Button size="sm" variant="ghost" {disabled} onclick={() => void run(() => scan())}>{tr('Check for Existing Logins')}</Button></div>{/if}
 {#if guide && !connected}<ol class="login-steps"><li><span>{tr(guide.opened ? 'Finish signing in inside the terminal window that opened.' : 'A terminal could not be opened. Copy this command and run it in your own terminal.')}</span><code class="login-command">{guide.command}</code><div class="onboarding-actions"><Button size="sm" variant="ghost" {disabled} onclick={() => void run(async () => { await navigator.clipboard.writeText(guide!.command); copied = true; })}>{#if copied}<Check size={14}/>{tr('Copied')}{:else}{tr('Copy Login Command')}{/if}</Button><Button size="sm" variant="ghost" {disabled} onclick={() => void signIn()}>{tr('Reopen Terminal')}</Button></div><small>{tr('Install the official command-line tool first if the command is not available.')}</small></li><li><span>{tr('Come back here and check for the new account.')}</span><Button size="sm" variant="secondary" {disabled} aria-busy={pending} onclick={() => void run(() => scan())}>{tr('I Have Signed In — Check Again')}</Button></li></ol>{/if}
 {#if !guide && !record}<Button size="sm" variant="ghost" class="advanced-toggle" {disabled} aria-expanded={advanced} onclick={() => { advanced = !advanced; }}>{tr('Advanced: Use an Existing Folder')}</Button>
  {#if advanced}<form onsubmit={e => { e.preventDefault(); void run(async () => { await invoke('account_directory', {provider: family, directory}); await scan(directory); }); }}><InputField label={tr('Configuration Directory')} value={directory} {disabled} oninput={e => { directory = e.currentTarget.value; }}/><p class="group-description">{tr('Enter the full directory path, not a credential or token file.')}</p><Button size="sm" variant="secondary" type="submit" disabled={disabled || !directory.trim()}>{tr('Connect and Detect')}</Button></form>{/if}
 {/if}
 {#if status}<p class="group-description" role="status">{status}</p>{/if}
 {#if results && results.length > 0}<ul class="detection-results" aria-label={tr('Detection Results')}>{#each results as a (a.id)}<li><strong>{a.email || a.name}{a.id === targetId ? ' · ' + tr('Current Account') : ''}</strong><span>{tr(connectionSummary(a))}</span>{#if a.error || a.warning}<small>{tr(a.error || a.warning || '')}</small>{/if}</li>{/each}</ul>{/if}
 {#if error}<p class="inline-error" role="alert">{error}</p>{/if}
</section>
