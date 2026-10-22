import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {Updates,useUpdater} from '../Updates';
import {getVersion} from '@tauri-apps/api/app';
import {ChevronLeft,RefreshCw,Plus,Ellipsis,Check,TriangleAlert,ExternalLink} from 'lucide-react';
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
import {trayAccounts} from '../desktop';
import {TrayPanel} from './TrayPanel';
import {useDensity} from './useDensity';
import './preview.css';
import {usePanelHeight} from './usePanelHeight';

type Page='home'|'detail'|'settings'|'configure'|'add'|'history'|'about'|'updates';
type Route={key:number;page:Page;accountId?:string;tab?:string;range?:string};
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
 const densityPreference=useDensity();
 const [routes,setRoutes]=useState<Route[]>([{key:0,page:'home'}]);
 const sequence=useRef(0),heading=useRef<HTMLHeadingElement>(null);
 const previousRoute=useRef(0),lastTrigger=useRef<HTMLElement|null>(null),returnFocus=useRef(new Map<number,HTMLElement|'menu'>());
 // Drafts live only for this running app. They are never stored in browser storage.
 const [drafts,setDrafts]=useState<Record<string,AccountDraft>>({});
 const [version,setVersion]=useState(''),[now,setNow]=useState(Date.now());
 const current=routes.at(-1)!;
 usePanelHeight(current.key,state,densityPreference.density);
 const language=state?.settings.language==='system'||!state?navigator.language:state.settings.language;
 const tr=(s:string)=>providerText(s,language);
 const t={...textFor(language),pin_limit:tr('Choose up to three menu bar metrics per account.')},basic=messages(language);
 const account=state?.accounts.find(a=>a.id===current.accountId);
 const push=(page:Page,details:Omit<Route,'page'|'key'>={})=>{
  const trigger=document.querySelector('[role="menu"]')?'menu':lastTrigger.current??document.activeElement;
  if(trigger==='menu'||trigger instanceof HTMLElement)returnFocus.current.set(current.key,trigger);
  setRoutes(r=>[...r,{key:++sequence.current,page,...details}]);
 };
 const back=()=>setRoutes(r=>r.length>1?r.slice(0,-1):r);
 const addAccount=()=>{push('add');void send({method:'discover'}).catch(()=>{});};
 const retryAccount=(accountId:string)=>{if(state&&!busy&&!refreshing)void refreshWithFeedback(state,current.key,accountId);};
 const refreshable=current.page==='home'||current.page==='history'||current.page==='detail'&&current.tab!=='settings';
 const refresh=()=>{if(state&&refreshable&&!busy&&!refreshing)void refreshWithFeedback(state,current.key,current.accountId);};
 const refreshFeedback=feedback?.scope===current.key?feedback:null;
 // The finished result is shown on the button itself (icon + a short label beside it); the full sentence is only announced.
 const refreshOutcome=refreshFeedback&&!refreshFeedback.pending?refreshFeedback.result??null:null;
 useEffect(()=>{
  void getVersion().then(setVersion).catch(()=>{});
  const tick=setInterval(()=>{if(!document.hidden)setNow(Date.now());},30_000);
  return()=>clearInterval(tick);
 },[]);
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
   if(e.key==='Escape'&&!document.querySelector('[role="menu"],[role="listbox"],[role="dialog"]')){e.preventDefault();void invoke('hide');}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[current,refreshable,busy,refreshing,state,refreshWithFeedback]);
 const title=current.page==='detail'?account?.name??'':current.page==='settings'?t.settings:current.page==='configure'?t.configure:current.page==='add'?tr('Add Account'):current.page==='history'?t.history:current.page==='about'?basic.about:current.page==='updates'?t.checkUpdates:'TokenPlan';
 return <MotionConfig reducedMotion="user"><main className="mac-preview" data-density={densityPreference.density} onClickCapture={e=>{lastTrigger.current=(e.target as Element).closest<HTMLElement>('button');}}>
  <header className={`preview-header ${current.page==='home'?'home-header':''}`}>
   {current.page!=='home'&&<Button className="icon-button back-button" size="sm" variant="ghost" aria-label={basic.back} onClick={back}><ChevronLeft size={21}/></Button>}
   <div className="page-title">{current.page==='home'?<img src="/capsule.png" alt=""/>:current.page==='detail'&&account?<ProviderLogo family={account.family}/>:null}<h1 ref={heading} tabIndex={-1}>{title}</h1></div>
   <div className="header-actions">
    {refreshable&&<>
     {refreshOutcome&&<span className="refresh-status" data-tone={refreshOutcome.tone} aria-hidden="true">{tr(refreshOutcome.short)}</span>}
     <Button className="icon-button refresh-button" size="sm" variant="ghost" aria-label={basic.refresh} aria-busy={refreshing} aria-disabled={busy||refreshing} data-refreshing={refreshing} data-result={refreshOutcome?.tone} onClick={refresh}>
      {refreshOutcome?.tone==='success'?<Check size={18}/>:refreshOutcome?<TriangleAlert size={18}/>:<RefreshCw className="refresh-symbol" size={18}/>}
     </Button></>}
    {current.page==='configure'&&<Button className="icon-button" size="sm" variant="ghost" aria-label={tr('Add Account')} onClick={addAccount}><Plus size={20}/></Button>}
    {current.page==='home'&&<DropdownMenu label={basic.more} iconOnly icon={<Ellipsis size={19}/>} items={[
     {label:tr('Add Account'),onSelect:addAccount},{label:t.configure,onSelect:()=>push('configure')},{label:t.history,onSelect:()=>push('history')},
     {label:t.settings,onSelect:()=>push('settings')},...(import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'?[]:[{label:t.checkUpdates,onSelect:()=>push('updates')}]),{label:basic.about,onSelect:()=>push('about')},
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
    {state&&route.page==='home'&&<>{platform&&platform!=='macos'&&<TrayPanel state={state} label={t.tray} open={accountId=>push('detail',{accountId,tab:'usage'})}/>}{!state.accounts.some(a=>a.enabled)?<div className="empty-state"><p>{tr('No accounts yet. Add one to start tracking your usage.')}</p><div className="empty-actions"><Button size="sm" variant="secondary" onClick={addAccount}><Plus size={15}/>{tr('Add Account')}</Button></div></div>:<><HomeTips state={state} send={send} language={language} addAccount={addAccount}/><Dashboard accounts={state.accounts} open={accountId=>push('detail',{accountId,tab:'usage'})} openSettings={accountId=>push('detail',{accountId,tab:'settings'})} retry={retryAccount} busy={busy||refreshing} now={now} language={language} missing={basic.missing} remaining={state.settings.showRemaining}/><Button className="add-account-row" variant="ghost" size="sm" onClick={addAccount}><Plus size={15}/>{tr('Add Account')}</Button></>}</>}
    {state&&a&&route.page==='detail'&&<AccountDetail draft={drafts[a.id]??{}} onDraftChange={patch=>setDrafts(d=>({...d,[a.id]:{...d[a.id],...patch}}))} badge={trayAccounts(state.accounts).find(item=>item.id===a.id)?.badge} traySettings={state.settings} account={a} tab={route.tab??'usage'} onTab={tab=>setRoutes(r=>r.map(item=>item.key===route.key?{...item,tab}:item))} history={range=>push('history',{accountId:a.id,range})} send={send} t={t} busy={busy} language={language} now={now} remaining={state.settings.showRemaining} missing={basic.missing}/>}
    {state&&route.page==='settings'&&<GeneralSettings platform={platform} densityPreference={densityPreference} state={state} send={send} t={t} busy={busy} language={language}/>}
    {state&&route.page==='configure'&&<ServiceConfiguration state={state} send={send} t={t} busy={busy} language={language} add={addAccount} open={accountId=>push('detail',{accountId,tab:'settings'})}/>}
    {state&&route.page==='add'&&<AddAccount state={state} send={send} t={t} busy={busy} language={language} open={accountId=>push('detail',{accountId,tab:'settings'})}/>}
    {state&&route.page==='history'&&<>{a&&<div className="history-account-context">{a.name}{a.email&&<span>{a.email}</span>}</div>}<HistoryPage accounts={a?[a]:state.accounts} t={t} language={language} initialRange={route.range}/></>}
    {route.page==='updates'&&<Updates showHeading={false} t={t} updater={updater} automatic={state?.settings.autoUpdates??true} onAutomatic={autoUpdates=>{void send({method:'settings',value:{autoUpdates}}).catch(()=>{});}}/>}
    {route.page==='about'&&<section className="about"><img src="/capsule.png" alt=""/><h2>TokenPlan</h2><p>{version}</p>{import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'&&<p className="muted">{tr('Design Preview')}</p>}
     <p className="about-tagline">{tr('Track your AI subscriptions and API balances from your menu bar or system tray.')}</p>
     <div className="about-links">{([['Project Home','https://github.com/onevalar/token-plan'],['Release Notes','https://github.com/onevalar/token-plan/releases'],['Report a Problem','https://github.com/onevalar/token-plan/issues/new'],['License','https://github.com/onevalar/token-plan/blob/main/LICENSE']] as const).map(([label,url])=><Button key={url} size="sm" variant="ghost" onClick={()=>{void invoke('open_link',{url}).catch(e=>console.error('Link could not be opened',e));}}><span>{tr(label)}</span><ExternalLink size={14} aria-hidden="true"/></Button>)}</div>
     <p className="about-credit">{tr('Based on OpenUsage by Robin Ebers, released under the MIT License.')}</p>
     <p className="about-credit">{tr('TokenPlan sends no analytics or crash reports. Credentials stay on this computer.')}</p></section>}
   </div></div>;
  })}</div>
 </main></MotionConfig>;
}
