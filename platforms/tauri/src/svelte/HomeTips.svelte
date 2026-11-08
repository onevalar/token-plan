<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {Bell, X} from '@lucide/svelte';
 import {providerText} from '../providerText';
 import type {DesktopState, Send} from '../desktop';
 const WELCOME = 'tokenplan.tip.welcome', ALERTS = 'tokenplan.tip.alerts';
 const seen = (key: string) => { try { return localStorage.getItem(key) === '1'; } catch { return false; } };
 const remember = (key: string) => { try { localStorage.setItem(key, '1'); } catch { /* Device hint is shown again next time. */ } };
 let {state: desktopState, send, language, addAccount}: {state: DesktopState; send: Send; language: string; addAccount: () => void} = $props();
 const tr = (s: string) => providerText(s, language);
 let welcome = $state(!seen(WELCOME)), alerts = $state(!seen(ALERTS)), pending = $state(false), error = $state('');
 const hasAccounts = $derived(desktopState.accounts.some(a => a.enabled)), alertsOff = $derived(desktopState.settings.notifications.every(on => !on));
 const nearLimit = $derived(desktopState.accounts.some(a => a.enabled && a.metrics.some(m => m.placement === 'home' && m.hasData && m.percent != null && m.percent >= 70)));
 const closeWelcome = () => { remember(WELCOME); welcome = false; }, closeAlerts = () => { remember(ALERTS); alerts = false; };
 async function turnOn() {
  pending = true; error = '';
  try { await send({method: 'notificationPermission'}); await send({method: 'settings', value: {notifications: [true, true, true]}}); closeAlerts(); }
  catch (e) { console.error('Notification permission failed', e); error = tr('Allow TokenPlan notifications in system settings, then try again.'); }
  finally { pending = false; }
 }
</script>

{#if hasAccounts && welcome}<section class="tip-card" aria-label={tr('Welcome to TokenPlan')}>
 <div class="tip-heading"><h2>{tr('Welcome to TokenPlan')}</h2><Button size="sm" variant="ghost" class="tip-close" aria-label={tr('Dismiss')} onclick={closeWelcome}><X size={14}/></Button></div>
 <ul><li>{tr('Accounts already signed in on this Mac appear here automatically.')}</li><li>{tr('“5h” and “1w” are usage windows of 5 hours and 1 week. The hourglass shows when each one resets.')}</li><li>{tr('Click an account for details, or use More → Add Account to track another login.')}</li></ul>
 <div class="tip-actions"><Button size="sm" variant="secondary" onclick={() => { closeWelcome(); addAccount(); }}>{tr('Add Account')}</Button><Button size="sm" variant="ghost" onclick={closeWelcome}>{tr('Got It')}</Button></div>
</section>
{:else if hasAccounts && alerts && alertsOff && nearLimit}<section class="tip-card" aria-label={tr('Get a heads-up before you run out.')}>
 <div class="tip-heading"><h2><Bell size={14} aria-hidden="true"/>{tr('Get a heads-up before you run out.')}</h2><Button size="sm" variant="ghost" class="tip-close" aria-label={tr('Dismiss')} onclick={closeAlerts}><X size={14}/></Button></div><p>{tr('TokenPlan can notify you when a limit is almost used up, or on track to run out before it resets.')}</p>
 {#if error}<p class="inline-error" role="alert">{error}</p>{/if}
 <div class="tip-actions"><Button size="sm" variant="secondary" disabled={pending} onclick={() => void turnOn()}>{tr('Turn On Alerts')}</Button><Button size="sm" variant="ghost" onclick={closeAlerts}>{tr('Not Now')}</Button></div>
</section>{/if}
