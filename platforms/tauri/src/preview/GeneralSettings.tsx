import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {TrayGlyph,RingLayoutPicker} from './TrayPreview';
import {SystemSettings} from '../SystemSettings';
import {trayAccounts,type DesktopState,type Send} from '../desktop';
import type {Copy} from '../copy';
import {providerText} from '../providerText';
import {Group,SelectRow,ToggleRow,useChange} from './shared';
import type {Density,useDensity} from './useDensity';
import type {useHomeUsageStyle} from './useHomeUsageStyle';
import {homeUsageStyles,type HomeUsageStyle} from '../homeUsage';

export function GeneralSettings({state,send,t,busy,language,densityPreference,usageStylePreference,platform}:{platform:string;densityPreference:ReturnType<typeof useDensity>;usageStylePreference:ReturnType<typeof useHomeUsageStyle>;state:DesktopState;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language),{pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const settings=(value:unknown)=>void change({method:'settings',value});
 const shown=trayAccounts(state.accounts),[accountsOpen,setAccountsOpen]=useState(false);
 const enabled=state.accounts.filter(a=>a.enabled),inTray=enabled.filter(a=>a.tray).length;

 return <div className="general-preferences">
  {notice}
  {densityPreference.failed&&<p role="alert" className="inline-error">{t.failed}</p>}
  {usageStylePreference.error&&<p role="alert" className="inline-error">{tr(usageStylePreference.error)}</p>}
  <Group title={tr('Appearance and Language')}>
   <SelectRow label={t.language} value={state.settings.language} disabled={disabled} options={[{value:'system',label:t.system},{value:'en',label:'English'},{value:'zh-Hans',label:'简体中文'},{value:'zh-Hant',label:'繁體中文'},{value:'ja',label:'日本語'},{value:'ko',label:'한국어'}]} onValueChange={language=>settings({language})}/>
   <SelectRow label={t.appearance} value={state.settings.appearance} disabled={disabled} options={['system','light','dark'].map(value=>({value,label:t[value as 'system']}))} onValueChange={appearance=>settings({appearance})}/>
   <SelectRow label={tr('Home Layout')} value={densityPreference.density} options={[{value:'compact',label:tr('Compact')},{value:'comfortable',label:tr('Comfortable')}]} onValueChange={value=>densityPreference.changeDensity(value as Density)}/>
   <SelectRow label={tr('Home Usage Style')} value={usageStylePreference.style} options={Object.entries(homeUsageStyles).map(([value,label])=>({value,label:tr(label)}))} onValueChange={value=>usageStylePreference.changeStyle(value as HomeUsageStyle)}/>
   <ToggleRow label={t.showRemaining} checked={state.settings.showRemaining} disabled={disabled} onCheckedChange={showRemaining=>settings({showRemaining})}/>
  </Group>
  <Group title={tr('Data Refresh')}>
   <ToggleRow label={t.autoRefresh} checked={state.settings.autoRefresh} disabled={disabled} onCheckedChange={autoRefresh=>settings({autoRefresh})}/>
   {state.settings.autoRefresh&&<SelectRow label={t.interval} value={String(state.settings.refreshMinutes)} disabled={disabled} options={[1,2,5,10,15,30,60].map(n=>({value:String(n),label:`${n} ${tr('Minutes')}`}))} onValueChange={v=>settings({refreshMinutes:Number(v)})}/>}
  </Group>
  <Group title={platform==='macos'?tr('Menu Bar'):t.tray} description={tr('Menu bar accounts follow the same order as under Accounts.')}>
   <SelectRow label={platform==='macos'?tr('Menu Bar Style'):t.trayStyle} value={state.settings.trayStyle} disabled={disabled} options={[{value:'ring',label:t.ring},{value:'percentage',label:t.percentage}]} onValueChange={trayStyle=>settings({trayStyle})}/>
   {state.settings.trayStyle==='ring'&&<RingLayoutPicker value={state.settings.ringIconPosition} disabled={disabled} tr={tr} onChange={ringIconPosition=>settings({ringIconPosition})}/>}
   {platform&&platform!=='macos'&&<p className="group-description">{tr('Selected accounts appear as live system tray indicators. Each value uses its own icon in percentage mode. Your desktop controls icon spacing, order and overflow.')}</p>}
   {platform==='windows'&&<p className="group-description">{tr('If an indicator is hidden, move it from the taskbar overflow area into the system tray.')}</p>}
   <div className="menu-bar-preview" aria-label={tr('Menu Bar Preview')}>
    {shown.map(a=><TrayGlyph key={a.id} family={a.family} badge={a.badge} metrics={a.metrics.filter(m=>m.pinned)} style={state.settings.trayStyle} position={state.settings.ringIconPosition}/>)}
    {!shown.length&&<span className="muted">{tr('No Accounts Selected')}</span>}
   </div>
   {enabled.length>0&&<Button variant="ghost" className="disclosure-row" aria-expanded={accountsOpen} onClick={()=>setAccountsOpen(open=>!open)}><span>{tr('Accounts in the Menu Bar')}</span><span className="disclosure-count">{inTray} / {enabled.length}</span><ChevronDown size={15} aria-hidden="true" data-open={accountsOpen}/></Button>}
   {accountsOpen&&enabled.map(a=><ToggleRow key={a.id} label={a.email?`${a.name} · ${a.email}`:a.name} checked={a.tray} disabled={disabled} onCheckedChange={value=>void change({method:'tray',accountId:a.id,value})}/>)}
  </Group>
  <div className="system-preferences"><SystemSettings state={state} send={send} busy={disabled}/></div>
 </div>;
}
