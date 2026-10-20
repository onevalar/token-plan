import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {invoke} from '@tauri-apps/api/core';
import {getVersion} from '@tauri-apps/api/app';
import {RefreshCw} from 'lucide-react';
import {MotionConfig} from 'motion/react';
import {Button} from './components/arc/button/button';
import {DropdownMenu} from './components/arc/dropdown-menu/dropdown-menu';
import {Dashboard,ProviderLogo} from './Dashboard';
import {MetricRow} from './Metrics';
import {ServiceConfiguration} from './ServiceConfiguration';
import {useDesktop} from './useDesktop';
import {AccountSettings} from './AccountSettings';
import {GeneralSettings} from './GeneralSettings';
import {History} from './History';
import {Updates,useUpdater} from './Updates';
import {accountTitle} from './usage';
import {messages} from './i18n';
import {providerText} from './providerText';
import {textFor} from './copy';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import './components/arc/foundation.css';
import './style.css';

function App(){
 const {state,send,busy,error}=useDesktop();
 const updater=useUpdater(state?.settings.autoUpdates??false);
 const [page,setPage]=useState('home');const [selected,setSelected]=useState<string|null>(null);
 useEffect(()=>{window.scrollTo({top:0,behavior:'instant'});},[page,selected]);
 const [version,setVersion]=useState('');
 useEffect(()=>{void getVersion().then(setVersion).catch(()=>{});},[]);
 const [tab,setTab]=useState('usage');const [locale,setLocale]=useState<string|null>(null);const [now,setNow]=useState(0);
 useEffect(()=>{setLocale(navigator.language);const tick=()=>setNow(Date.now());tick();const timer=setInterval(()=>{if(!document.hidden)tick();},30_000);return()=>clearInterval(timer);},[]);
 const language=state?.settings.language==='system'?locale:state?.settings.language??locale;
 useEffect(()=>{
  if(language)document.documentElement.lang=language;
  const media=matchMedia('(prefers-color-scheme: dark)');
  const change=()=>{document.documentElement.dataset.theme=state?.settings.appearance==='system'||!state?media.matches?'dark':'light':state.settings.appearance;};
  change();media.addEventListener('change',change);return()=>media.removeEventListener('change',change);
 },[language,state?.settings.appearance]);
 useEffect(()=>{if(selected&&state&&!state.accounts.some(a=>a.id===selected)){setSelected(null);setPage('configure');}},[state,selected]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   if(event.defaultPrevented)return;
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='r'){event.preventDefault();void send({method:'refresh',accountId:selected??undefined}).catch(()=>{});}
   if(event.key==='Escape'&&!document.querySelector('[role="menu"],[role="listbox"],[role="dialog"]')){event.preventDefault();void invoke('hide');}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[page,selected,send]);
 if(!language)return null;
 const basic=messages(language),t=textFor(language);
 const account=state?.accounts.find(a=>a.id===selected);
 const go=(target:string)=>{setPage(target);setSelected(null);};
 const open=(id:string)=>{setSelected(id);setTab('usage');setPage('detail');};
 const act=(request:Parameters<typeof send>[0])=>{void send(request).catch(()=>{});};
 return <MotionConfig reducedMotion="user"><main>
  <header className="app-header"><div className="brand"><img src="/capsule.png" alt=""/><h1>TokenPlan</h1></div><div className="actions">
   <Button size="sm" variant="secondary" loading={busy} onClick={()=>act({method:'refresh',accountId:selected??undefined})}><RefreshCw size={15}/>{basic.refresh}</Button>
   <DropdownMenu label={basic.more} items={[
    {label:t.configure,onSelect:()=>go('configure')},{label:t.settings,onSelect:()=>go('settings')},
    {label:t.checkUpdates,onSelect:()=>go('updates')},{label:basic.about,onSelect:()=>go('about')},
    {label:basic.quit,onSelect:()=>{void invoke('quit');}},
   ]}/>
  </div></header>
  {page!=='home'&&<div className="back"><Button size="sm" variant="ghost" onClick={()=>page==='accountHistory'?setPage('detail'):go(page==='history'?'configure':'home')}>{basic.back}</Button></div>}
  {error&&<p role="alert">{error==="shortcut_failed"?providerText("This shortcut is unavailable. Choose another combination.",language):error==="notification_failed"?providerText("Allow TokenPlan notifications in system settings, then try again.",language):t[error as keyof typeof t]??basic[error as keyof typeof basic]??t.request_failed}</p>}
  {!state&&!error&&<p role="status">{basic.loading}</p>}
  {page==='about'&&<section className="about"><img src="/capsule.png" alt=""/><h2>TokenPlan</h2><p>{version}</p></section>}
  {page!=='updates'&&updater.status==='available'&&<Button variant="secondary" onClick={()=>go('updates')}>{t.updateAvailable} {updater.version}</Button>}
  {page==='updates'&&<Updates t={t} updater={updater} automatic={state?.settings.autoUpdates??true} onAutomatic={autoUpdates=>act({method:'settings',value:{autoUpdates}})}/>}
  {state&&page==='settings'&&<GeneralSettings state={state} send={send} t={t} busy={busy}/>}
  {state&&page==='configure'&&<ServiceConfiguration state={state} send={send} t={t} language={language} busy={busy} open={open} history={()=>go('history')}/>}
  {state&&(page==='history'||page==='accountHistory')&&<History synced={state.sync.enabled} accounts={page==='accountHistory'&&account?[account]:state.accounts} t={t} language={language}/>}
  {state&&page==='home'&&<div aria-busy={busy}>{!state.accounts.some(a=>a.enabled)&&<p>{basic.empty}</p>}<Dashboard accounts={state.accounts} open={open} now={now} language={language} missing={basic.missing} remaining={state.settings.showRemaining}/></div>}
  {account&&page==='detail'&&<section className="provider detail">
   <div className="provider-heading"><div className="account-identity"><ProviderLogo family={account.family}/><div className="identity-text"><div className="identity-line"><h2>{account.name}</h2><span className="plan">{account.plan}</span></div>{account.email&&<span className="email">{accountTitle(account.email)}</span>}</div></div></div>
   <nav className="tabs" aria-label={account.name}><Button variant={tab==='usage'?'primary':'ghost'} aria-pressed={tab==='usage'} onClick={()=>setTab('usage')}>{t.usage}</Button><Button variant={tab==='settings'?'primary':'ghost'} aria-pressed={tab==='settings'} onClick={()=>setTab('settings')}>{t.placement}</Button></nav>
   {tab==='settings'?<AccountSettings account={account} send={send} t={t} busy={busy} language={language}/>:<>
    {account.error&&<p role="status">{providerText(account.error,language)}</p>}
    {account.metrics.filter(m=>m.placement!=='hidden').map(m=><MetricRow key={m.id} metric={m} now={now} missing={basic.missing} language={language} remaining={state?.settings.showRemaining}/>)}
    {account.note&&<p>{account.note}</p>}<History compact onOpen={()=>setPage('accountHistory')} synced={state?.sync.enabled??false} accounts={[account]} t={t} language={language}/>
   </>}
  </section>}
 </main></MotionConfig>;
}
createRoot(document.getElementById('root')!).render(<App/>);
