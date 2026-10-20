import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {invoke} from '@tauri-apps/api/core';
import {getVersion} from '@tauri-apps/api/app';
import {Hourglass} from 'lucide-react';
import {MotionConfig} from 'motion/react';
import {Button} from './components/arc/button/button';
import {DropdownMenu} from './components/arc/dropdown-menu/dropdown-menu';
import {Switch} from './components/arc/switch/switch';
import {useDesktop} from './useDesktop';
import {AccountSettings} from './AccountSettings';
import {GeneralSettings} from './GeneralSettings';
import {History} from './History';
import {Updates,useUpdater} from './Updates';
import {type Metric} from './desktop';
import {accountTitle,countdown,period} from './usage';
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
   if(event.key==='Escape'&&!document.querySelector('[role="menu"],[role="listbox"],[role="dialog"]')){event.preventDefault();if(page==='home')void invoke('hide');else{setPage('home');setSelected(null);}}
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
  <header><div className="brand"><img src="/capsule.png" alt=""/><h1>TokenPlan</h1></div><div className="actions">
   <Button variant="secondary" loading={busy} onClick={()=>act({method:'refresh',accountId:selected??undefined})}>{basic.refresh}</Button>
   <DropdownMenu label={basic.more} items={[
    {label:t.configure,onSelect:()=>go('configure')},{label:t.settings,onSelect:()=>go('settings')},
    {label:t.checkUpdates,onSelect:()=>go('updates')},{label:basic.about,onSelect:()=>go('about')},
    {label:basic.quit,onSelect:()=>{void invoke('quit');}},
   ]}/>
  </div></header>
  {page!=='home'&&<div className="back"><Button variant="ghost" onClick={()=>go('home')}>{basic.back}</Button></div>}
  {error&&<p role="alert">{error==="shortcut_failed"?providerText("This shortcut is unavailable. Choose another combination.",language):error==="notification_failed"?providerText("Allow TokenPlan notifications in system settings, then try again.",language):t[error as keyof typeof t]??basic[error as keyof typeof basic]??t.request_failed}</p>}
  {!state&&!error&&<p role="status">{basic.loading}</p>}
  {page==='about'&&<section className="about"><img src="/capsule.png" alt=""/><h2>TokenPlan</h2><p>{version}</p></section>}
  {page!=='updates'&&updater.status==='available'&&<Button variant="secondary" onClick={()=>go('updates')}>{t.updateAvailable} {updater.version}</Button>}
  {page==='updates'&&<Updates t={t} updater={updater} automatic={state?.settings.autoUpdates??true} onAutomatic={autoUpdates=>act({method:'settings',value:{autoUpdates}})}/>}
  {state&&page==='settings'&&<GeneralSettings state={state} send={send} t={t} busy={busy}/>}
  {state&&page==='configure'&&<>
   <History synced={state.sync.enabled} accounts={state.accounts} t={t} language={language}/>
   <section className="settings-list"><div className="provider-heading"><h2>{t.configure}</h2><Button disabled={busy} onClick={()=>act({method:'discover'})}>{t.discover}</Button></div>
    {state.accounts.map((a,i)=><div className="service-row" key={a.id}>
      <Button variant="ghost" onClick={()=>open(a.id)}>{a.name}{a.email?` · ${accountTitle(a.email)}`:''}</Button>
      <div className="actions"><Button variant="ghost" aria-label={`${t.up} ${a.name} ${a.email}`} disabled={busy||i===0} onClick={()=>act({method:'move',accountId:a.id,value:-1})}>↑</Button><Button variant="ghost" aria-label={`${t.down} ${a.name} ${a.email}`} disabled={busy||i===state.accounts.length-1} onClick={()=>act({method:'move',accountId:a.id,value:1})}>↓</Button><Switch aria-label={`${t.enabled} ${a.name} ${a.email}`} checked={a.enabled} disabled={busy} onCheckedChange={value=>act({method:'enabled',accountId:a.id,value})}/></div>
    </div>)}
   </section></>}
  {state&&page==='home'&&<div aria-busy={busy}>{!state.accounts.some(a=>a.enabled)&&<p>{basic.empty}</p>}
   {state.accounts.filter(a=>a.enabled).map(a=><section className="provider" key={a.id}>
    <div className="provider-heading"><div className="provider-identity"><img className="provider-logo" src={`/providers/${a.family}.svg`} alt=""/><div><h2>{a.name}</h2><div className="account-caption">{a.email&&<span className="email">{accountTitle(a.email)}</span>}<span className="plan">{a.plan}</span></div></div></div><Button variant="ghost" aria-label={`${a.name} ${a.email}`} onClick={()=>open(a.id)}>›</Button></div>
    {a.error&&<p role="status" className="muted">{providerText(a.error,language)}</p>}
    {a.metrics.filter(m=>m.placement==='home').map(m=><MetricRow key={m.id} metric={m} now={now} missing={basic.missing} language={language}/>)}
   </section>)}
  </div>}
  {account&&page==='detail'&&<section className="provider detail">
   <div className="provider-heading"><div><h2>{account.name}{account.email?` · ${accountTitle(account.email)}`:''}</h2><span>{account.plan}</span></div></div>
   <nav className="tabs" aria-label={account.name}><Button variant={tab==='usage'?'primary':'ghost'} aria-pressed={tab==='usage'} onClick={()=>setTab('usage')}>{t.usage}</Button><Button variant={tab==='settings'?'primary':'ghost'} aria-pressed={tab==='settings'} onClick={()=>setTab('settings')}>{t.placement}</Button></nav>
   {tab==='settings'?<AccountSettings account={account} send={send} t={t} busy={busy} language={language}/>:<>
    {account.error&&<p role="status">{providerText(account.error,language)}</p>}
    {account.metrics.filter(m=>m.placement!=='hidden').map(m=><MetricRow key={m.id} metric={m} now={now} missing={basic.missing} language={language}/>)}
    {account.note&&<p>{account.note}</p>}<History synced={state.sync.enabled} accounts={[account]} t={t} language={language}/>
   </>}
  </section>}
 </main></MotionConfig>;
}
function MetricRow({metric:m,now,missing,language}:{metric:Metric;now:number;missing:string;language:string}){
 const duration=period(m.periodSeconds);const scope=m.label.match(/\b(argon|sonnet|claude|spark|fable)\b/i)?.[0];
 const name=duration?[scope,duration].filter(Boolean).join(' · '):providerText(m.label,language);
 const reset=now&&m.hasData?countdown(m.resetsAt,now):null;
 const format=(v:number,unit:string)=>unit==='dollars'?`$${v.toFixed(2)}`:unit==='yuan'?`¥${v.toFixed(2)}`:v.toLocaleString(undefined,{maximumFractionDigits:2});
 const t=textFor(language);
 if(m.chart.length){
  const max=Math.max(1,...m.chart.map(p=>p.value));
  return <div className="metric-chart"><span>{name}</span><svg viewBox="0 0 300 60" role="img" aria-label={name}>{m.chart.map((p,i)=><rect key={i} x={i*300/m.chart.length} y={60-p.value/max*56} width={Math.max(1,300/m.chart.length-2)} height={Math.max(1,p.value/max*56)} fill="currentColor"><title>{p.label}: {p.value.toLocaleString()}</title></rect>)}</svg></div>;
 }
 return <div><div className="metric"><span className="metric-name">{name}</span>
  {m.hasData&&m.percent!=null?<><progress aria-label={name} max={100} value={Math.max(0,Math.min(100,m.percent))}/><span className="value">{Math.round(m.percent)}%</span></>:<span className="amount">{!m.hasData?missing:m.values.length?m.values.map(v=>`${format(v.amount,v.unit)} ${providerText(v.label,language)}`).join(' · '):m.amount==null?missing:format(m.amount,m.unit)}</span>}
  <span className="reset">{reset&&!m.notStarted&&<Hourglass size={14} aria-hidden="true"/>}{m.notStarted?t.notStarted:reset??'—'}</span>
 </div>{m.expiries.length>0&&<div className="expiries"><span>{t.expires}</span><ul>{m.expiries.map((date,i)=><li key={i}>{new Date(date).toLocaleString(language)}</li>)}</ul></div>}</div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
