import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {Updates,useUpdater} from '../Updates';
import {getVersion} from '@tauri-apps/api/app';
import {ChevronLeft,RefreshCw,Plus,Ellipsis} from 'lucide-react';
import {MotionConfig} from 'motion/react';
import {Button} from '../components/arc/button/button';
import {DropdownMenu} from '../components/arc/dropdown-menu/dropdown-menu';
import {Dashboard,ProviderLogo} from '../Dashboard';
import {useDesktop} from '../useDesktop';
import {messages} from '../i18n';
import {textFor} from '../copy';
import {providerText} from '../providerText';
import {AccountDetail} from './AccountDetail';
import {GeneralSettings} from './GeneralSettings';
import {ServiceConfiguration} from './ServiceConfiguration';
import {HistoryPage} from './HistoryPage';
import {trayAccounts} from '../desktop';
import {TrayPanel} from './TrayPanel';
import {useDensity} from './useDensity';
import './preview.css';

type Page='home'|'detail'|'settings'|'configure'|'add'|'history'|'about'|'updates';
type Route={key:number;page:Page;accountId?:string;tab?:string;range?:string};
export function DesktopApp() {
 const {state,send,busy,error}=useDesktop();
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
 const [version,setVersion]=useState(''),[now,setNow]=useState(Date.now());
 const current=routes.at(-1)!;
 const language=state?.settings.language==='system'||!state?navigator.language:state.settings.language;
 const tr=(s:string)=>providerText(s,language);
 const t={...textFor(language),pin_limit:tr('Choose up to three menu bar metrics per account.')},basic=messages(language);
 const account=state?.accounts.find(a=>a.id===current.accountId);
 const push=(page:Page,details:Omit<Route,'page'|'key'>={})=>setRoutes(r=>[...r,{key:++sequence.current,page,...details}]);
 const back=()=>setRoutes(r=>r.length>1?r.slice(0,-1):r);
 const refreshable=current.page==='home'||current.page==='history'||current.page==='detail'&&current.tab!=='settings';
 const refresh=()=>{if(refreshable&&!busy)void send({method:'refresh',accountId:current.accountId}).catch(()=>{});};
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
 useLayoutEffect(()=>{heading.current?.focus({preventScroll:true});},[current.key]);
 useEffect(()=>{
  if(!state)return;
  // A removed account also invalidates its deeper history route, returning to its real origin.
  const missing=routes.findIndex(r=>r.accountId&&!state.accounts.some(a=>a.id===r.accountId));
  if(missing>=0)setRoutes(r=>r.slice(0,Math.max(1,missing)));
 },[state,routes]);
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{
   if(e.defaultPrevented)return;
   if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='r'){e.preventDefault();refresh();}
   if((e.metaKey&&e.key==='[')||(e.altKey&&e.key==='ArrowLeft')){e.preventDefault();back();}
   if(e.key==='Escape'&&!document.querySelector('[role="menu"],[role="listbox"],[role="dialog"]')){e.preventDefault();void invoke('hide');}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[current,refreshable,busy,send]);
 const title=current.page==='detail'?account?.name??'':current.page==='settings'?t.settings:current.page==='configure'?t.configure:current.page==='add'?tr('Add Service'):current.page==='history'?t.history:current.page==='about'?basic.about:current.page==='updates'?t.checkUpdates:'TokenPlan';
 return <MotionConfig reducedMotion="user"><main className="mac-preview" data-density={densityPreference.density}>
  <header className={`preview-header ${current.page==='home'?'home-header':''}`}>
   {current.page!=='home'&&<Button className="icon-button back-button" size="sm" variant="ghost" aria-label={basic.back} onClick={back}><ChevronLeft size={21}/></Button>}
   <div className="page-title">{current.page==='home'?<img src="/capsule.png" alt=""/>:current.page==='detail'&&account?<ProviderLogo family={account.family}/>:null}<h1 ref={heading} tabIndex={-1}>{title}</h1></div>
   <div className="header-actions">
    {refreshable&&<Button className="icon-button" size="sm" variant="ghost" aria-label={basic.refresh} loading={busy} onClick={refresh}><RefreshCw size={17}/></Button>}
    {current.page==='configure'&&<Button className="icon-button" size="sm" variant="ghost" aria-label={tr('Add Service')} onClick={()=>{push('add');void send({method:'discover'}).catch(()=>{});}}><Plus size={20}/></Button>}
    {current.page==='home'&&<DropdownMenu label={basic.more} iconOnly icon={<Ellipsis size={19}/>} items={[
     {label:t.configure,onSelect:()=>push('configure')},{label:t.history,onSelect:()=>push('history')},
     {label:t.settings,onSelect:()=>push('settings')},...(import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'?[]:[{label:t.checkUpdates,onSelect:()=>push('updates')}]),{label:basic.about,onSelect:()=>push('about')},
     {label:basic.quit,separatorBefore:true,onSelect:()=>{void invoke('quit');}},
    ]}/>}
   </div>
  </header>
  {error&&(!state||refreshable||current.page==='add'||current.page==='updates')&&<p role="alert" className="inline-error">{t[error as keyof typeof t]??basic[error as keyof typeof basic]??t.request_failed}</p>}
  {!state&&!error&&<p role="status">{basic.loading}</p>}
  {current.page!=='updates'&&updater.status==='available'&&<Button variant="secondary" onClick={()=>push('updates')}>{t.updateAvailable} {updater.version}</Button>}
  <div className="page-stack">{routes.map(route=>{
   const a=state?.accounts.find(a=>a.id===route.accountId);
   return <div className="preview-page" data-page={route.page} key={route.key} hidden={route.key!==current.key}>
    {state&&route.page==='home'&&<>{platform&&platform!=='macos'&&<TrayPanel state={state} label={t.tray} open={accountId=>push('detail',{accountId,tab:'usage'})}/>}{!state.accounts.some(a=>a.enabled)?<div className="empty-state"><p>{basic.empty}</p><Button size="sm" variant="secondary" onClick={()=>push('configure')}>{t.configure}</Button></div>:<Dashboard accounts={state.accounts} open={accountId=>push('detail',{accountId,tab:'usage'})} now={now} language={language} missing={basic.missing} remaining={state.settings.showRemaining}/>}</>}
    {state&&a&&route.page==='detail'&&<AccountDetail badge={trayAccounts(state.accounts).find(item=>item.id===a.id)?.badge} traySettings={state.settings} account={a} tab={route.tab??'usage'} onTab={tab=>setRoutes(r=>r.map(item=>item.key===route.key?{...item,tab}:item))} history={range=>push('history',{accountId:a.id,range})} send={send} t={t} busy={busy} language={language} now={now} remaining={state.settings.showRemaining} missing={basic.missing}/>}
    {state&&route.page==='settings'&&<GeneralSettings platform={platform} densityPreference={densityPreference} state={state} send={send} t={t} busy={busy} language={language}/>}
    {state&&(route.page==='configure'||route.page==='add')&&<ServiceConfiguration state={state} send={send} t={t} busy={busy} language={language} adding={route.page==='add'} open={accountId=>push('detail',{accountId,tab:'settings'})}/>}
    {state&&route.page==='history'&&<>{a&&<div className="history-account-context">{a.name}{a.email&&<span>{a.email}</span>}</div>}<HistoryPage accounts={a?[a]:state.accounts} t={t} language={language} initialRange={route.range}/></>}
    {route.page==='updates'&&<Updates showHeading={false} t={t} updater={updater} automatic={state?.settings.autoUpdates??true} onAutomatic={autoUpdates=>{void send({method:'settings',value:{autoUpdates}}).catch(()=>{});}}/>}
    {route.page==='about'&&<section className="about"><img src="/capsule.png" alt=""/><h2>TokenPlan</h2><p>{version}</p>{import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'&&<p className="muted">{tr('Design Preview')}</p>}</section>}
   </div>;
  })}</div>
 </main></MotionConfig>;
}
