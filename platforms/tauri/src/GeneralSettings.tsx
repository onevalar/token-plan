import {ProviderLogo} from './Dashboard';
import {SystemSettings} from './SystemSettings';
import {Switch} from './components/arc/switch/switch';
import {Select} from './components/arc/select/select';

import {trayAccounts,type DesktopState,type Send} from './desktop';
import type {Copy} from './copy';
export function GeneralSettings({state,send,t,busy,platform}:{state:DesktopState;send:Send;t:Copy;busy:boolean;platform:string}) {
 // Windows and Linux trays fit one small square icon, so only the macOS strip has a style.
 const strip=platform!=='windows'&&platform!=='linux';
 const change=(value:unknown)=>{void send({method:'settings',value}).catch(()=>{});};
 return <section className="settings-list">
  <h2>{t.settings}</h2>
  <Select label={t.language} value={state.settings.language} disabled={busy} options={[{value:'system',label:t.system},{value:'en',label:'English'},{value:'zh-Hans',label:'简体中文'},{value:'zh-Hant',label:'繁體中文'},{value:'ja',label:'日本語'},{value:'ko',label:'한국어'}]} onValueChange={language=>change({language})}/>
  <Select label={t.appearance} value={state.settings.appearance} disabled={busy} options={['system','light','dark'].map(value=>({value,label:t[value as 'system']}))} onValueChange={appearance=>change({appearance})}/>
  <Switch label={t.showRemaining} checked={state.settings.showRemaining} disabled={busy} onCheckedChange={showRemaining=>change({showRemaining})}/>
  <Switch label={t.autoRefresh} checked={state.settings.autoRefresh} disabled={busy} onCheckedChange={autoRefresh=>change({autoRefresh})}/>
  <Select label={t.interval} value={String(state.settings.refreshMinutes)} disabled={busy} options={[1,2,5,10,15,30,60].map(n=>({value:String(n),label:`${n} min`}))} onValueChange={v=>change({refreshMinutes:Number(v)})}/>
  {strip&&<><Select label={t.trayStyle} value={state.settings.trayStyle} disabled={busy} options={[{value:'ring',label:t.ring},{value:'percentage',label:t.percentage}]} onValueChange={trayStyle=>change({trayStyle})}/>
  <div className="tray-preview" aria-label={t.tray}>{trayAccounts(state.accounts).map(a=><span className="tray-account-preview" key={a.id}>
   <span className="tray-symbol" data-pinned={a.metrics.some(m=>m.pinned)} aria-label={a.name}><ProviderLogo family={a.family}/>{state.settings.trayStyle==='ring'&&<svg viewBox="0 0 40 40" aria-hidden="true">{a.metrics.filter(m=>m.pinned).slice(0,2).map((m,i)=><g key={m.id}><circle cx="20" cy="20" r={18-i*4} fill="none" stroke="currentColor" opacity=".2" strokeWidth="2"/><circle cx="20" cy="20" r={18-i*4} fill="none" stroke="currentColor" strokeWidth="2" pathLength="100" strokeDasharray={`${m.hasData&&m.percent!=null?Math.max(0,Math.min(100,m.percent)):0} 100`} transform="rotate(-90 20 20)"/></g>)}</svg>}</span>
   {a.badge&&<sup>{a.badge}</sup>}{state.settings.trayStyle==='percentage'&&<span className="tray-numbers">{a.metrics.filter(m=>m.pinned).slice(0,2).map(m=><span key={m.id}>{m.hasData&&m.percent!=null?`${Math.round(m.percent)}%`:'—'}</span>)}</span>}
  </span>)}</div></>}
  {state.accounts.filter(a=>a.enabled).map(a=><div className="account-option" key={a.id}><span>{a.name}{a.email?` · ${a.email}`:''}</span><Switch aria-label={`${a.name} ${a.email}`} checked={a.tray} disabled={busy} onCheckedChange={value=>{void send({method:'tray',accountId:a.id,value}).catch(()=>{});}}/></div>)}
  <SystemSettings state={state} send={send} busy={busy}/>
 </section>;
}
