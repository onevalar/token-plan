<script lang="ts">
 import {onMount,untrack} from 'svelte';
 import {invoke} from '@tauri-apps/api/core';
 import {listen} from '@tauri-apps/api/event';
 import {getVersion} from '@tauri-apps/api/app';
 import {ChevronLeft,RefreshCw,Plus,Ellipsis,Check,TriangleAlert,ArrowUpCircle} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import * as DropdownMenu from '@valar/svelte-ui/dropdown-menu';
 import {messages} from '../i18n';
 import {textFor} from '../copy';
 import {providerText} from '../providerText';
 import {createDesktop} from './desktop.svelte';
 import {createRefreshFeedback} from './refresh.svelte';
 import {createUpdater} from './updater.svelte';
 import {createQuotaSamples} from './quotaSamples.svelte';
 import {createAccountSetups,createDensity,createHomeUsageStyle,createPanelSurface,createPanelAppearance} from './preferences.svelte';
 import {observePanelHeight} from './panelHeight';
 import Dashboard from './Dashboard.svelte';
 import ProviderLogo from './ProviderLogo.svelte';
 import AccountDetail from './AccountDetail.svelte';
 import type {AccountDraft} from './accounts/AccountConfiguration.svelte';
 import GeneralSettings from './GeneralSettings.svelte';
 import ServiceConfiguration from './ServiceConfiguration.svelte';
 import AddAccount from './AddAccount.svelte';
 import HomeTips from './HomeTips.svelte';
 import HistoryPage from './HistoryPage.svelte';
 import Updates from './Updates.svelte';
 import '../preview/preview.css';
 import '../preview/settings.css';

 type Page='home'|'detail'|'settings'|'configure'|'add'|'history'|'about'|'updates';
 type Route={key:number;page:Page;accountId?:string;setupId?:string;editing?:boolean;focusManagement?:boolean;range?:string};
 const desktop=createDesktop(),{send}=desktop;
 const snapshot=$derived(desktop.state),busy=$derived(desktop.busy),error=$derived(desktop.error);
 const quotaSamples=createQuotaSamples(()=>snapshot?.accounts),refreshFeedback=createRefreshFeedback(send);
 const updater=createUpdater(()=>import.meta.env.VITE_MAC_NAVIGATION_PREVIEW!=='1'&&(snapshot?.settings.autoUpdates??false));
 let platform=$state(''),reduceTransparency=$state(false),version=$state(''),now=$state(Date.now());
 const setups=createAccountSetups(),densityPreference=createDensity(),usageStylePreference=createHomeUsageStyle();
 const panelSurface=createPanelSurface(()=>platform,()=>reduceTransparency);
 const panelAppearance=createPanelAppearance(()=>platform,()=>snapshot?.settings.appearance);
 let routes=$state<Route[]>([{key:0,page:'home'}]),sequence=0,heading:HTMLHeadingElement;
 let previousRoute=-1,lastTrigger:HTMLElement|null=null;
 const returnFocus=new Map<number,HTMLElement|'menu'>();
 let drafts=$state<Record<string,AccountDraft>>({}),addedName=$state('');
 const current=$derived(routes.at(-1)!);
 const language=$derived(snapshot?.settings.language==='system'||!snapshot?navigator.language:snapshot.settings.language);
 const tr=(s:string)=>providerText(s,language);
 const t=$derived({...textFor(language),configure:tr('Subscription Management'),history:tr('Usage Statistics'),pin_limit:tr('Choose up to three menu bar metrics per account.')}),basic=$derived(messages(language));
 const refreshable=$derived(current.page==='home'||current.page==='history'||current.page==='detail'&&!current.editing);
 const feedback=$derived(refreshFeedback.feedback?.scope===current.key?refreshFeedback.feedback:null);
 const outcome=$derived(feedback&&!feedback.pending?feedback.result??null:null);
 const title=$derived(current.page==='detail'?snapshot?.accounts.find(a=>a.id===current.accountId)?.name??'':current.page==='settings'?t.settings:current.page==='configure'?tr('Subscription Management'):current.page==='add'?tr('Add Account'):current.page==='history'?tr('Usage Statistics'):current.page==='about'?basic.about:current.page==='updates'?t.checkUpdates:'TokenPlan');

 function push(page:Page,details:Omit<Route,'page'|'key'>={}){
  const trigger=document.querySelector('[role="menu"]')?'menu':lastTrigger??document.activeElement;
  if(trigger==='menu'||trigger instanceof HTMLElement)returnFocus.set(current.key,trigger);
  routes=[...routes,{key:++sequence,page,...details}];
 }
 function back(){if(current.editing){if(!busy)routes=routes.map(item=>item.key===current.key?{...item,editing:false}:item);}else if(routes.length>1)routes=routes.slice(0,-1);}
 function addAccount(){addedName='';if(current.page!=='configure')push('configure');push('add');void send({method:'discover'}).catch(()=>{});}
 function finishAdding(name:string){addedName=name;back();}
 function retryAccount(accountId:string){if(snapshot&&!busy&&!refreshFeedback.refreshing)void refreshFeedback.refresh(snapshot,current.key,accountId);}
 function refresh(){if(snapshot&&refreshable&&!busy&&!refreshFeedback.refreshing)void refreshFeedback.refresh(snapshot,current.key,current.accountId);}
 function keyboard(event:KeyboardEvent){
  if(event.defaultPrevented)return;
  if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='r'){event.preventDefault();refresh();}
  if((event.metaKey&&event.key==='[')||(event.altKey&&event.key==='ArrowLeft')){event.preventDefault();back();}
  if(event.key==='Escape'&&!document.querySelector('[role="menu"],[role="listbox"],[role="dialog"]')){event.preventDefault();if(current.editing)back();else void invoke('hide');}
 }
 onMount(()=>{
  let active=true,receivedUpdate=false;
  type Frame={platform:string;rounded:boolean;reduceTransparency:boolean};
  const apply=(frame:Frame)=>{if(!active)return;document.documentElement.dataset.platform=frame.platform;document.documentElement.dataset.rounded=String(frame.rounded);platform=frame.platform;reduceTransparency=frame.reduceTransparency;};
  const stopFrame=listen<Frame>('panel-frame',event=>{receivedUpdate=true;apply(event.payload);});
  void stopFrame.then(()=>invoke<Frame>('panel_frame')).then(frame=>{if(!receivedUpdate)apply(frame);}).catch(()=>{});
  const stopHome=listen('show-home',()=>{routes=[{key:++sequence,page:'home'}];});
  void getVersion().then(value=>{if(active)version=value;}).catch(()=>{});
  const timer=setInterval(()=>{if(!document.hidden)now=Date.now();},30_000);
  return()=>{active=false;clearInterval(timer);void stopFrame.then(stop=>stop()).catch(()=>{});void stopHome.then(stop=>stop()).catch(()=>{});};
 });
 $effect(()=>{snapshot;now=Date.now();});
 $effect(()=>{
  document.documentElement.lang=language;document.documentElement.dataset.macPreview='true';
  const appearance=snapshot?.settings.appearance,media=matchMedia('(prefers-color-scheme: dark)');
  const theme=()=>{const dark=!appearance||appearance==='system'?media.matches:appearance==='dark';document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.classList.toggle('dark',dark);};
  theme();media.addEventListener('change',theme);
  return()=>{media.removeEventListener('change',theme);delete document.documentElement.dataset.macPreview;};
 });
 $effect(()=>{
  const key=current.key;
  untrack(()=>{
   if(key===previousRoute)return;
   const saved=key<previousRoute?returnFocus.get(key):null;
   const target=saved==='menu'?document.querySelector<HTMLElement>('.header-actions [aria-haspopup="menu"]'):saved;
   (target?.isConnected&&target.getClientRects().length&&!target.matches(':disabled')?target:heading)?.focus({preventScroll:true});
   returnFocus.delete(key);previousRoute=key;
  });
 });
 $effect(()=>{
  const accounts=snapshot?.accounts;
  untrack(()=>{
   for(const key of returnFocus.keys())if(!routes.some(route=>route.key===key))returnFocus.delete(key);
   if(!accounts)return;
   const missing=routes.findIndex(route=>route.accountId&&!accounts.some(account=>account.id===route.accountId));
   if(missing>=0)routes=routes.slice(0,Math.max(1,missing));
   if(Object.keys(drafts).some(id=>!accounts.some(account=>account.id===id)))drafts=Object.fromEntries(Object.entries(drafts).filter(([id])=>accounts.some(account=>account.id===id)));
  });
 });
 $effect(()=>{current.key;snapshot;densityPreference.density;return observePanelHeight();});
</script>

<svelte:window onkeydown={keyboard}/>
<main class="mac-preview" data-density={densityPreference.density} onclickcapture={event=>{lastTrigger=(event.target as Element).closest<HTMLElement>('button');}}>
 <header class="preview-header {current.page==='home'?'home-header':current.page==='configure'?'configure-header':''}">
  {#if current.page!=='home'}<Button class="back-button" size="icon" variant="ghost" aria-label={current.editing?t.finishEditing:basic.back} disabled={!!current.editing&&busy} onclick={back}><ChevronLeft size={21}/></Button>{/if}
  <div class="page-title">{#if current.page==='home'}<img src="/capsule.png" alt=""/>{:else if current.page==='detail'}{@const account=snapshot?.accounts.find(a=>a.id===current.accountId)}{#if account}<ProviderLogo family={account.family}/>{/if}{/if}<h1 bind:this={heading} tabindex="-1">{title}</h1></div>
  <div class="header-actions">
   {#if current.page==='home'&&updater.status==='available'&&!updater.skipped}<Button class="update-button" size="sm" variant="secondary" onclick={()=>push('updates')}><ArrowUpCircle size={15} aria-hidden="true"/><span>{t.update}</span><span class="update-version">{updater.version}</span></Button>{/if}
   {#if refreshable}
    {#if outcome}<span class="refresh-status" data-tone={outcome.tone} aria-hidden="true">{tr(outcome.short)}</span>{/if}
    <Button class="refresh-button" size="icon" variant="ghost" aria-label={basic.refresh} aria-busy={refreshFeedback.refreshing} aria-disabled={busy||refreshFeedback.refreshing} data-refreshing={refreshFeedback.refreshing} data-result={outcome?.tone} onclick={refresh}>
     {#if outcome?.tone==='success'}<Check size={18}/>{:else if outcome}<TriangleAlert size={18}/>{:else}<RefreshCw class="refresh-symbol" size={18}/>{/if}
    </Button>
   {/if}
   {#if current.page==='configure'}<Button size="sm" variant="ghost" onclick={addAccount}><Plus size={16}/>{tr('Add Account')}</Button>{/if}
   {#if current.page==='home'}
    <DropdownMenu.Root>
     <DropdownMenu.Trigger aria-label={basic.more} class="header-menu-trigger">
      {#snippet child({props})}<Button {...props} size="icon" variant="ghost" aria-label={basic.more}><Ellipsis size={19}/></Button>{/snippet}
     </DropdownMenu.Trigger>
     <DropdownMenu.Content align="end" class="header-menu" collisionPadding={12}>
      <DropdownMenu.Item onSelect={()=>push('settings')}>{t.settings}</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={()=>push('configure')}>{tr('Subscription Management')}</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={()=>push('history')}>{tr('Usage Statistics')}</DropdownMenu.Item>
      <DropdownMenu.Separator/>
      <DropdownMenu.Item onSelect={()=>{push('updates');void updater.checkNow();}}>{t.checkUpdates}</DropdownMenu.Item>
      <DropdownMenu.Item onSelect={()=>push('about')}>{basic.about}</DropdownMenu.Item>
      <DropdownMenu.Separator/>
      <DropdownMenu.Item onSelect={()=>{void invoke('quit');}}>{basic.quit}</DropdownMenu.Item>
     </DropdownMenu.Content>
    </DropdownMenu.Root>
   {/if}
  </div>
 </header>
 <p class="sr-only refresh-announcement" aria-live="polite" aria-atomic="true">{feedback?tr(feedback.pending?'Refreshing usage…':feedback.result!.message):''}</p>
 {#if error&&(!snapshot||refreshable||current.page==='add'||current.page==='updates')}<p role="alert" class="inline-error">{t[error as keyof typeof t]??basic[error as keyof typeof basic]??t.request_failed}</p>{/if}
 {#if !snapshot&&!error}<p role="status">{basic.loading}</p>{/if}
 <div class="page-stack">{#each routes as route (route.key)}
  {@const account=snapshot?.accounts.find(a=>a.id===route.accountId)}
  <div class="preview-page" data-page={route.page} hidden={route.key!==current.key}><div class="page-content">
   {#if snapshot&&route.page==='home'}
    {#if !snapshot.accounts.some(a=>a.enabled)}
     <div class="empty-state">{#if snapshot.accounts.some(a=>a.added)}<p>{tr('All accounts are hidden from Home. You can show them again in Subscription Management.')}</p><Button size="sm" variant="secondary" onclick={()=>push('configure')}>{t.configure}</Button>{:else}<p>{tr('No accounts yet. Add one to start tracking your usage.')}</p><div class="empty-actions"><Button size="sm" variant="secondary" onclick={addAccount}><Plus size={15}/>{tr('Add Account')}</Button></div>{/if}</div>
    {:else}
     <HomeTips state={snapshot} {send} {language} {addAccount}/>
     <Dashboard accounts={snapshot.accounts} open={accountId=>push('detail',{accountId})} openSettings={accountId=>push('detail',{accountId,focusManagement:true})} retry={retryAccount} busy={busy||refreshFeedback.refreshing} {now} {language} missing={basic.missing} remaining={snapshot.settings.showRemaining} usageStyle={usageStylePreference.style} accountStyle={usageStylePreference.styleFor}/>
    {/if}
   {/if}
   {#if snapshot&&account&&route.page==='detail'}<AccountDetail onSetupChange={setups.reload} {usageStylePreference} focusManagement={route.focusManagement} draft={drafts[account.id]??{}} onDraftChange={patch=>{drafts={...drafts,[account.id]:{...drafts[account.id],...patch}};}} retry={retryAccount} {account} editing={route.editing??false} onEditing={editing=>{routes=routes.map(item=>item.key===route.key?{...item,editing}:item);}} history={range=>push('history',{accountId:account.id,range})} {send} {t} {busy} {language} {now} remaining={snapshot.settings.showRemaining} missing={basic.missing}/>{/if}
   {#if snapshot&&route.page==='settings'}<GeneralSettings {platform} {panelAppearance} {panelSurface} openAccounts={()=>push('configure')} {densityPreference} {usageStylePreference} state={snapshot} {send} {t} {busy} {language} {now}/>{/if}
   {#if snapshot&&route.page==='configure'}{#if addedName}<p role="status" class="added-note">{tr('Added to Home')}: {addedName}</p>{/if}<ServiceConfiguration {setups} resume={setupId=>push('add',{setupId})} {platform} state={snapshot} {send} {t} {busy} {language}/>{/if}
   {#if snapshot&&route.page==='add'}<AddAccount setup={setups.records.find(item=>item.id===route.setupId)} onSetupChange={setups.reload} state={snapshot} {send} {t} {busy} {language} complete={finishAdding} open={accountId=>{back();push('detail',{accountId,focusManagement:true});}}/>{/if}
   {#if snapshot&&route.page==='history'}{#if quotaSamples.error}<p role="alert">{tr(quotaSamples.error)}</p>{/if}{#if account}<div class="history-account-context">{account.name}{#if account.email}<span>{account.email}</span>{/if}</div>{/if}<HistoryPage accounts={account?quotaSamples.accounts.filter(item=>item.id===account.id):quotaSamples.accounts} {t} {language} initialRange={route.range}/>{/if}
   {#if route.page==='updates'}<Updates {t} {updater} automatic={snapshot?.settings.autoUpdates??true} onAutomatic={autoUpdates=>{void send({method:'settings',value:{autoUpdates}}).catch(()=>{});}}/>{/if}
   {#if route.page==='about'}<section class="about"><img src="/capsule.png" alt=""/><div class="about-identity"><h2>TokenPlan</h2><p class="about-version">{version}</p>{#if import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'}<p class="muted">{tr('Design Preview')}</p>{/if}</div><p class="about-privacy">{tr('Local data is read only for display. No user information is collected.')}</p></section>{/if}
  </div></div>
 {/each}</div>
</main>
