import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {Updates,useUpdater} from '../Updates';
import {getVersion} from '@tauri-apps/api/app';
import {ChevronLeft,RefreshCw,Plus,Ellipsis,Check,TriangleAlert} from 'lucide-react';
import {MotionConfig} from 'motion/react';
import {Button} from '../components/arc/button/button';
import {DropdownMenu} from '../components/arc/dropdown-menu/dropdown-menu';
import {Dashboard,ProviderLogo} from '../Dashboard';
import {useDesktop} from '../useDesktop';
import {useRefreshFeedback} from '../useRefreshFeedback';
import {messages} from '../i18n';
import {textFor} from '../copy';
import {providerText} from '../providerText';
import {AccountDetail} from './AccountDetail';
import type {AccountDraft} from './AccountConfiguration';
import {GeneralSettings} from './GeneralSettings';
import {ServiceConfiguration} from './ServiceConfiguration';
import {AddAccount} from './AddAccount';
import {HomeTips} from './HomeTips';
import {HistoryPage} from './HistoryPage';
import {useDensity} from './useDensity';
import {useHomeUsageStyle} from './useHomeUsageStyle';
import {useAccountSetups} from './useAccountSetups';
import './preview.css';
import './settings.css';
import {usePanelHeight} from './usePanelHeight';

type Page='home'|'detail'|'settings'|'configure'|'add'|'history'|'about'|'updates';
type Route={key:number;page:Page;accountId?:string;setupId?:string;editing?:boolean;focusManagement?:boolean;range?:string};
export function DesktopApp() {
 const {state,send,busy,error}=useDesktop();
 const {feedback,refresh:refreshWithFeedback,refreshing}=useRefreshFeedback(send);
 const updater=useUpdater(import.meta.env.VITE_MAC_NAVIGATION_PREVIEW!=='1'&&(state?.settings.autoUpdates??false));
 const [platform,setPlatform]=useState('');
 useEffect(()=>{
  type Frame={platform:string;rounded:boolean};
  const apply=(frame:Frame)=>{document.documentElement.dataset.platform=frame.platform;document.documentElement.dataset.rounded=String(frame.rounded);setPlatform(frame.platform);};
  void invoke<Frame>('panel_frame').then(apply).catch(()=>{});
  const stop=listen<Frame>('panel-frame',e=>apply(e.payload));
  return()=>{void stop.then(f=>f()).catch(()=>{});};
 },[]);
 const setups=useAccountSetups();
 const densityPreference=useDensity();
 const usageStylePreference=useHomeUsageStyle();
 const [routes,setRoutes]=useState<Route[]>([{key:0,page:'home'}]);
 const sequence=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  const stop=listen('show-home',()=>setRoutes([{key:++sequence.current,page:'home'}]));
  return()=>{void stop.then(f=>f()).catch(()=>{});};
 },[]);
 const previousRoute=useRef(0),lastTrigger=useRef<HTMLElement|null>(null),returnFocus=useRef(new Map<number,HTMLElement|'menu'>());
 // Drafts live only for this running app. They are never stored in browser storage.
 const [drafts,setDrafts]=useState<Record<string,AccountDraft>>({});
 const [addedName,setAddedName]=useState('');
 const [version,setVersion]=useState(''),[now,setNow]=useState(Date.now());
 const current=routes.at(-1)!;
 usePanelHeight(current.key,state,densityPreference.density);
 const language=state?.settings.language==='system'||!state?navigator.language:state.settings.language;
 const tr=(s:string)=>providerText(s,language);
 const t={...textFor(language),configure:tr('Subscription Management'),history:tr('Usage Statistics'),pin_limit:tr('Choose up to three menu bar metrics per account.')},basic=messages(language);
 const account=state?.accounts.find(a=>a.id===current.accountId);
 const push=(page:Page,details:Omit<Route,'page'|'key'>={})=>{
  const trigger=document.querySelector('[role="menu"]')?'menu':lastTrigger.current??document.activeElement;
  if(trigger==='menu'||trigger instanceof HTMLElement)returnFocus.current.set(current.key,trigger);
  setRoutes(r=>[...r,{key:++sequence.current,page,...details}]);
 };
 const back=()=>{if(current.editing){if(!busy)setRoutes(r=>r.map(item=>item.key===current.key?{...item,editing:false}:item));}else setRoutes(r=>r.length>1?r.slice(0,-1):r);};
 const addAccount=()=>{setAddedName('');if(current.page!=='configure')push('configure');push('add');void send({method:'discover'}).catch(()=>{});};
 const finishAdding=(name:string)=>{setAddedName(name);back();};
 const retryAccount=(accountId:string)=>{if(state&&!busy&&!refreshing)void refreshWithFeedback(state,current.key,accountId);};
 const refreshable=current.page==='home'||current.page==='history'||current.page==='detail'&&!current.editing;
 const refresh=()=>{if(state&&refreshable&&!busy&&!refreshing)void refreshWithFeedback(state,current.key,current.accountId);};
 const refreshFeedback=feedback?.scope===current.key?feedback:null;
 // The finished result is shown on the button itself (icon + a short label beside it); the full sentence is only announced.
 const refreshOutcome=refreshFeedback&&!refreshFeedback.pending?refreshFeedback.result??null:null;
 useEffect(()=>{
  void getVersion().then(setVersion).catch(()=>{});
  const tick=setInterval(()=>{if(!document.hidden)setNow(Date.now());},30_000);
  return()=>clearInterval(tick);
 },[]);
 // Fresh data must render against the current time; otherwise reset countdowns wait for the next 30-second tick.
 useEffect(()=>{setNow(Date.now());},[state]);
 useEffect(()=>{
  document.documentElement.lang=language;
  document.documentElement.dataset.macPreview='true';
  const media=matchMedia('(prefers-color-scheme: dark)');
  const theme=()=>{document.documentElement.dataset.theme=!state||state.settings.appearance==='system'?media.matches?'dark':'light':state.settings.appearance;};
  theme();media.addEventListener('change',theme);
  return()=>{media.removeEventListener('change',theme);delete document.documentElement.dataset.macPreview;};
 },[language,state?.settings.appearance]);
 useLayoutEffect(()=>{
  const saved=current.key<previousRoute.current?returnFocus.current.get(current.key):null;
  const target=saved==='menu'?document.querySelector<HTMLElement>('.header-actions [aria-haspopup="menu"]'):saved;
  (target?.isConnected&&target.getClientRects().length&&!target.matches(':disabled')?target:heading.current)?.focus({preventScroll:true});
  returnFocus.current.delete(current.key);previousRoute.current=current.key;
 },[current.key]);
 useEffect(()=>{
  for(const key of returnFocus.current.keys())if(!routes.some(r=>r.key===key))returnFocus.current.delete(key);
  if(!state)return;
  // A removed account also invalidates its deeper history route, returning to its real origin.
  const missing=routes.findIndex(r=>r.accountId&&!state.accounts.some(a=>a.id===r.accountId));
  if(missing>=0)setRoutes(r=>r.slice(0,Math.max(1,missing)));
  setDrafts(d=>Object.keys(d).some(id=>!state.accounts.some(a=>a.id===id))?Object.fromEntries(Object.entries(d).filter(([id])=>state.accounts.some(a=>a.id===id))):d);
 },[state,routes]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(e.defaultPrevented)return;
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='r'){e.preventDefault();refresh();}
   if((e.metaKey&&e.key==='[')||(e.altKey&&e.key==='ArrowLeft')){e.preventDefault();back();}
   if(e.key==='Escape'&&!document.querySelector('[role="menu"],[role="listbox"],[role="dialog"]')){e.preventDefault();if(current.editing)back();else void invoke('hide');}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[current,refreshable,busy,refreshing,state,refreshWithFeedback]);
 const title=current.page==='detail'?account?.name??'':current.page==='settings'?t.settings:current.page==='configure'?tr('Subscription Management'):current.page==='add'?tr('Add Account'):current.page==='history'?tr('Usage Statistics'):current.page==='about'?basic.about:current.page==='updates'?t.checkUpdates:'TokenPlan';
 return <MotionConfig reducedMotion="user"><main className="mac-preview" data-density={densityPreference.density} onClickCapture={e=>{lastTrigger.current=(e.target as Element).closest<HTMLElement>('button');}}>
  <header className={`preview-header ${current.page==='home'?'home-header':current.page==='configure'?'configure-header':''}`}>
   {current.page!=='home'&&<Button className="icon-button back-button" size="sm" variant="ghost" aria-label={current.editing?t.cancel:basic.back} disabled={!!current.editing&&busy} onClick={back}><ChevronLeft size={21}/></Button>}
   <div className="page-title">{current.page==='home'?<img src="/capsule.png" alt=""/>:current.page==='detail'&&account?<ProviderLogo family={account.family}/>:null}<h1 ref={heading} tabIndex={-1}>{title}</h1></div>
   <div className="header-actions">
    {refreshable&&<>
     {refreshOutcome&&<span className="refresh-status" data-tone={refreshOutcome.tone} aria-hidden="true">{tr(refreshOutcome.short)}</span>}
     <Button className="icon-button refresh-button" size="sm" variant="ghost" aria-label={basic.refresh} aria-busy={refreshing} aria-disabled={busy||refreshing} data-refreshing={refreshing} data-result={refreshOutcome?.tone} onClick={refresh}>
      {refreshOutcome?.tone==='success'?<Check size={18}/>:refreshOutcome?<TriangleAlert size={18}/>:<RefreshCw className="refresh-symbol" size={18}/>}
     </Button></>}
    {current.page==='configure'&&<Button size="sm" variant="ghost" onClick={addAccount}><Plus size={16}/>{tr('Add Account')}</Button>}
    {current.page==='home'&&<DropdownMenu label={basic.more} iconOnly icon={<Ellipsis size={19}/>} items={[
     {label:t.settings,onSelect:()=>push('settings')},{label:tr('Subscription Management'),onSelect:()=>push('configure')},{label:tr('Usage Statistics'),onSelect:()=>push('history')},{label:t.checkUpdates,separatorBefore:true,onSelect:()=>{push('updates');void updater.checkNow();}},{label:basic.about,separatorBefore:false,onSelect:()=>push('about')},
     {label:basic.quit,separatorBefore:true,onSelect:()=>{void invoke('quit');}},
    ]}/>}
   </div>
  </header>
  <p className="sr-only refresh-announcement" aria-live="polite" aria-atomic="true">{refreshFeedback?tr(refreshFeedback.pending?'Refreshing usage…':refreshFeedback.result!.message):''}</p>
  {error&&(!state||refreshable||current.page==='add'||current.page==='updates')&&<p role="alert" className="inline-error">{t[error as keyof typeof t]??basic[error as keyof typeof basic]??t.request_failed}</p>}
  {!state&&!error&&<p role="status">{basic.loading}</p>}
  {current.page!=='updates'&&updater.status==='available'&&<Button variant="secondary" onClick={()=>push('updates')}>{t.updateAvailable} {updater.version}</Button>}
  <div className="page-stack">{routes.map(route=>{
   const a=state?.accounts.find(a=>a.id===route.accountId);
   return <div className="preview-page" data-page={route.page} key={route.key} hidden={route.key!==current.key}><div className="page-content">
    {state&&route.page==='home'&&<>{!state.accounts.some(a=>a.enabled)?<div className="empty-state">{state.accounts.some(a=>a.added)?<><p>{tr('All accounts are hidden from Home. You can show them again in Subscription Management.')}</p><Button size="sm" variant="secondary" onClick={()=>push('configure')}>{t.configure}</Button></>:<><p>{tr('No accounts yet. Add one to start tracking your usage.')}</p><div className="empty-actions"><Button size="sm" variant="secondary" onClick={addAccount}><Plus size={15}/>{tr('Add Account')}</Button></div></>}</div>:<><HomeTips state={state} send={send} language={language} addAccount={addAccount}/><Dashboard accounts={state.accounts} open={accountId=>push('detail',{accountId})} openSettings={accountId=>push('detail',{accountId,focusManagement:true})} retry={retryAccount} busy={busy||refreshing} now={now} language={language} missing={basic.missing} remaining={state.settings.showRemaining} usageStyle={usageStylePreference.style} accountStyle={usageStylePreference.styleFor}/><Button className="add-account-row" variant="ghost" size="sm" onClick={addAccount}><Plus size={15}/>{tr('Add Account')}</Button></>}</>}
    {state&&a&&route.page==='detail'&&<AccountDetail onSetupChange={setups.reload} usageStylePreference={usageStylePreference} focusManagement={route.focusManagement} draft={drafts[a.id]??{}} onDraftChange={patch=>setDrafts(d=>({...d,[a.id]:{...d[a.id],...patch}}))} retry={retryAccount} account={a} editing={route.editing??false} onEditing={editing=>setRoutes(r=>r.map(item=>item.key===route.key?{...item,editing}:item))} history={range=>push('history',{accountId:a.id,range})} send={send} t={t} busy={busy} language={language} now={now} remaining={state.settings.showRemaining} missing={basic.missing}/>}
    {state&&route.page==='settings'&&<GeneralSettings platform={platform} openAccounts={()=>push('configure')} densityPreference={densityPreference} usageStylePreference={usageStylePreference} state={state} send={send} t={t} busy={busy} language={language} now={now}/>}
    {state&&route.page==='configure'&&<>{addedName&&<p role="status" className="added-note">{tr('Added to Home')}: {addedName}</p>}<ServiceConfiguration setups={setups} resume={setupId=>push('add',{setupId})} platform={platform} state={state} send={send} t={t} busy={busy} language={language}/></>}
    {state&&route.page==='add'&&<AddAccount setup={setups.records.find(r=>r.id===route.setupId)} onSetupChange={setups.reload} state={state} send={send} t={t} busy={busy} language={language} complete={finishAdding} open={accountId=>{back();push('detail',{accountId});}}/>}
    {state&&route.page==='history'&&<>{a&&<div className="history-account-context">{a.name}{a.email&&<span>{a.email}</span>}</div>}<HistoryPage accounts={a?[a]:state.accounts} t={t} language={language} initialRange={route.range}/></>}
    {route.page==='updates'&&<Updates showHeading={false} t={t} updater={updater} automatic={state?.settings.autoUpdates??true} onAutomatic={autoUpdates=>{void send({method:'settings',value:{autoUpdates}}).catch(()=>{});}}/>}
    {route.page==='about'&&<section className="about"><img src="/capsule.png" alt=""/>
     <div className="about-identity"><h2>TokenPlan</h2><p className="about-version">{version}</p>{import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'&&<p className="muted">{tr('Design Preview')}</p>}</div>
     <p className="about-privacy">{tr('TokenPlan sends no analytics or crash reports.')}</p></section>}
   </div></div>;
  })}</div>
 </main></MotionConfig>;
}
