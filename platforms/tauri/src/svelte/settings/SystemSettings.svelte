<script lang="ts">
 import {onDestroy, untrack} from 'svelte';
 import {invoke} from '@tauri-apps/api/core';
 import {X} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {providerText} from '../../providerText';
 import type {DesktopState, Send} from '../../desktop';
 import Group from '../Group.svelte';
 import ToggleRow from '../ToggleRow.svelte';
 let {state: desktopState, send, busy}: {state: DesktopState; send: Send; busy: boolean} = $props();
 let error = $state(''), pending = $state(false), recording = $state(false);
 let notificationsOn = $state(untrack(() => desktopState.settings.notifications.some(Boolean)));
 let previous = untrack(() => desktopState.settings.notifications.some(Boolean) ? [...desktopState.settings.notifications] : [true, false, false]);
 const language = $derived(desktopState.settings.language === 'system' ? navigator.language : desktopState.settings.language);
 const t = (key: string) => providerText(key, language);
 async function capture(paused: boolean) { try { await invoke('shortcut_capture', {paused}); recording = paused; } catch (e) { console.error('Shortcut capture failed', e); error = 'This shortcut is unavailable. Choose another combination.'; } }
 onDestroy(() => { void invoke('shortcut_capture', {paused: false}).catch(() => {}); });
 async function notifications(values: boolean[], master?: boolean) {
  pending = true; error = '';
  try { if (values.some(Boolean)) await send({method: 'notificationPermission'}); await send({method: 'settings', value: {notifications: values}}); if (master !== undefined) notificationsOn = master; }
  catch (e) { console.error('Notification settings failed', e); error = e instanceof Error && e.message === 'notification_failed' ? 'Allow TokenPlan notifications in system settings, then try again.' : 'Could not save. Try again.'; }
  finally { pending = false; }
 }
 async function shortcut(value: string) { error = ''; pending = true; try { await send({method: 'settings', value: {shortcut: value}}); } catch (e) { console.error('Shortcut save failed', e); error = 'This shortcut is unavailable. Choose another combination.'; } finally { await capture(false); pending = false; } }
 function keydown(e: KeyboardEvent) {
  if (!recording || e.key === 'Tab') return; e.preventDefault(); e.stopPropagation();
  if (e.key === 'Escape') { void capture(false); return; }
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
  if (!e.ctrlKey && !e.altKey && !e.metaKey) { error = 'Use Control, Alt or Command with another key.'; return; }
  void shortcut([e.metaKey ? 'Super' : '', e.ctrlKey ? 'Control' : '', e.altKey ? 'Alt' : '', e.shiftKey ? 'Shift' : '', e.code].filter(Boolean).join('+'));
 }
</script>

<section class="settings-list">
 <Group title={t('Notifications')}>
  <ToggleRow label={t('Enable Notifications')} disabled={busy || pending} checked={notificationsOn} onCheckedChange={on => { if (!on) previous = [...desktopState.settings.notifications]; void notifications(on ? previous.some(Boolean) ? previous : [true, false, false] : [false, false, false], on); }}/>
  {#if notificationsOn}<div class="notification-options">{#each ['Almost Out', 'Cutting It Close', 'Will Run Out'] as label, i (label)}<div class="notification-row"><ToggleRow label={t(label)} disabled={busy || pending} checked={desktopState.settings.notifications[i]} onCheckedChange={on => { const values = [...desktopState.settings.notifications]; values[i] = on; void notifications(values); }}/><p class="muted">{t(['Alert when a limit drops below 10% remaining.', 'Alert when a limit is projected to finish with little left.', 'Alert when a limit is projected to finish before it resets.'][i])}</p></div>{/each}</div>{/if}
 </Group>
 <Group title={t('Global Shortcut')}>
  <div class="shortcut-setting"><span>{t('Show or hide TokenPlan')}</span><div class="shortcut-controls">
   <Button size="sm" variant="secondary" class="shortcut-recorder" aria-label={t('Record Shortcut')} aria-pressed={recording} disabled={busy || pending || !desktopState.settings.shortcutAvailable} onclick={() => void capture(!recording)} onblur={() => void capture(false)} onkeydown={keydown}>{recording ? t('Press Shortcut') : desktopState.settings.shortcut || t('Record Shortcut')}</Button>
   {#if desktopState.settings.shortcut}<Button size="sm" variant="ghost" aria-label={t('Clear shortcut')} disabled={busy || pending} onclick={() => void shortcut('')}><X size={16}/></Button>{/if}
  </div></div>
  {#if !desktopState.settings.shortcutAvailable}<p role="status" class="group-description">{t('Global shortcuts are unavailable in this desktop session.')}</p>{/if}
 </Group>
 {#if error}<p role="alert">{t(error)}</p>{/if}
</section>
