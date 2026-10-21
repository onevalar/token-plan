import {TrayGlyph,RingLayoutPicker} from './TrayPreview';
import {SystemSettings} from '../SystemSettings';
import {trayAccounts,type DesktopState,type Send} from '../desktop';
import type {Copy} from '../copy';
import {providerText} from '../providerText';
import {Group,SelectRow,ToggleRow,useChange} from './shared';
import type {Density,useDensity} from './useDensity';

export function GeneralSettings({state,send,t,busy,language,densityPreference,platform}:{platform:string;densityPreference:ReturnType<typeof useDensity>;state:DesktopState;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language),{pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const settings=(value:unknown)=>void change({method:'settings',value});
 const shown=trayAccounts(state.accounts);

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
  <Group title={platform==='macos'?tr('Menu Bar'):t.tray} description={tr('Accounts follow the order in Service Configuration.')}>
   <SelectRow label={platform==='macos'?tr('Menu Bar Style'):t.trayStyle} value={state.settings.trayStyle} disabled={disabled} options={[{value:'ring',label:t.ring},{value:'percentage',label:t.percentage}]} onValueChange={trayStyle=>settings({trayStyle})}/>
   {state.settings.trayStyle==='ring'&&<RingLayoutPicker value={state.settings.ringIconPosition} disabled={disabled} tr={tr} onChange={ringIconPosition=>settings({ringIconPosition})}/>}
   {platform&&platform!=='macos'&&<p className="group-description">{tr('Windows and Linux show these indicators in the tray panel. The system tray keeps the TokenPlan icon.')}</p>}
   <div className="menu-bar-preview" aria-label={tr('Menu Bar Preview')}>
    {shown.map(a=><TrayGlyph key={a.id} family={a.family} badge={a.badge} metrics={a.metrics.filter(m=>m.pinned)} style={state.settings.trayStyle} position={state.settings.ringIconPosition}/>)}
    {!shown.length&&<span className="muted">{tr('No Accounts Selected')}</span>}
   </div>
   {state.accounts.filter(a=>a.enabled).map(a=><ToggleRow key={a.id} label={a.email?`${a.name} · ${a.email}`:a.name} checked={a.tray} disabled={disabled} onCheckedChange={value=>void change({method:'tray',accountId:a.id,value})}/>)}
  </Group>
  <div className="system-preferences"><SystemSettings state={state} send={send} busy={disabled}/></div>
 </div>;
}
