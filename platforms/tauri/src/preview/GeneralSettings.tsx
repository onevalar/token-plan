import type {CSSProperties} from 'react';
import logoSizes from '../tray-logo-sizes.json';
import {ProviderLogo} from '../Dashboard';
import {SystemSettings} from '../SystemSettings';
import {trayAccounts,type DesktopState,type Send} from '../desktop';
import type {Copy} from '../copy';
import {providerText} from '../providerText';
import {Group,SelectRow,ToggleRow,useChange} from './shared';
import type {Density,useDensity} from './useDensity';

export function GeneralSettings({state,send,t,busy,language,densityPreference}:{densityPreference:ReturnType<typeof useDensity>;state:DesktopState;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language),{pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const settings=(value:unknown)=>void change({method:'settings',value});
 const shown=trayAccounts(state.accounts);
 const markSize=(family:string,rings:number)=>`${(logoSizes[family as keyof typeof logoSizes]??logoSizes.tokenplan)[rings>1?1:0]*.7}px`;
 return <div className="general-preferences">
  {notice}
  {densityPreference.failed&&<p role="alert" className="inline-error">{t.failed}</p>}
  <Group title={tr('Appearance and Language')}>
   <SelectRow label={t.language} value={state.settings.language} disabled={disabled} options={[{value:'system',label:t.system},{value:'en',label:'English'},{value:'zh-Hans',label:'简体中文'},{value:'zh-Hant',label:'繁體中文'},{value:'ja',label:'日本語'},{value:'ko',label:'한국어'}]} onValueChange={language=>settings({language})}/>
   <SelectRow label={t.appearance} value={state.settings.appearance} disabled={disabled} options={['system','light','dark'].map(value=>({value,label:t[value as 'system']}))} onValueChange={appearance=>settings({appearance})}/>
   <SelectRow label={tr('Home Layout')} value={densityPreference.density} options={[{value:'compact',label:tr('Compact')},{value:'comfortable',label:tr('Comfortable')}]} onValueChange={value=>densityPreference.changeDensity(value as Density)}/>
   <ToggleRow label={t.showRemaining} checked={state.settings.showRemaining} disabled={disabled} onCheckedChange={showRemaining=>settings({showRemaining})}/>
  </Group>
  <Group title={tr('Data Refresh')}>
   <ToggleRow label={t.autoRefresh} checked={state.settings.autoRefresh} disabled={disabled} onCheckedChange={autoRefresh=>settings({autoRefresh})}/>
   {state.settings.autoRefresh&&<SelectRow label={t.interval} value={String(state.settings.refreshMinutes)} disabled={disabled} options={[1,2,5,10,15,30,60].map(n=>({value:String(n),label:`${n} ${tr('Minutes')}`}))} onValueChange={v=>settings({refreshMinutes:Number(v)})}/>}
  </Group>
  <Group title={tr('Menu Bar')} description={tr('Accounts follow the order in Service Configuration.')}>
   <SelectRow label={t.trayStyle} value={state.settings.trayStyle} disabled={disabled} options={[{value:'ring',label:t.ring},{value:'percentage',label:t.percentage}]} onValueChange={trayStyle=>settings({trayStyle})}/>
   <div className="menu-bar-preview" aria-label={tr('Menu Bar Preview')}>
    {shown.map(a=><span className="tray-account-preview" key={a.id}>
     <span className="tray-symbol" style={{'--ring-logo-size':markSize(a.family,a.metrics.filter(m=>m.pinned).length)} as CSSProperties} data-rings={state.settings.trayStyle==='ring'?a.metrics.filter(m=>m.pinned).slice(0,2).length:0}><ProviderLogo family={a.family}/>{state.settings.trayStyle==='ring'&&<svg viewBox="0 0 40 40" aria-hidden="true">{a.metrics.filter(m=>m.pinned).slice(0,2).map((m,i)=>{
      // The bridge already applies used/remaining mode to the displayed percentage.
      const percent=m.percent??0;
      return <g key={m.id}><circle cx="20" cy="20" r={17.5-i*4.5} fill="none" stroke="currentColor" opacity=".2" strokeWidth="2.6"/><circle cx="20" cy="20" r={17.5-i*4.5} fill="none" stroke="currentColor" strokeWidth="2.6" pathLength="100" strokeDasharray={`${m.hasData?Math.max(0,Math.min(100,percent)):0} 100`} transform="rotate(-90 20 20)"/></g>;
     })}</svg>}</span>
     {a.badge&&<sup>{a.badge}</sup>}{state.settings.trayStyle==='percentage'&&<span className="tray-numbers">{a.metrics.filter(m=>m.pinned).slice(0,2).map(m=><span key={m.id}>{m.hasData&&m.percent!=null?`${Math.round(m.percent)}%`:'—'}</span>)}</span>}
    </span>)}
    {!shown.length&&<span className="muted">{tr('No Accounts Selected')}</span>}
   </div>
   {state.accounts.filter(a=>a.enabled).map(a=><ToggleRow key={a.id} label={a.email?`${a.name} · ${a.email}`:a.name} checked={a.tray} disabled={disabled} onCheckedChange={value=>void change({method:'tray',accountId:a.id,value})}/>)}
  </Group>
  <div className="system-preferences"><SystemSettings state={state} send={send} busy={disabled}/></div>
 </div>;
}
