import {SystemSettings} from '../SystemSettings';
import type {DesktopState,Send} from '../desktop';
import type {Copy} from '../copy';
import {providerText} from '../providerText';
import {Group,SelectRow,ToggleRow,useChange} from './shared';
import type {Density,useDensity} from './useDensity';
import type {useHomeUsageStyle} from './useHomeUsageStyle';
import {UsageStylePicker} from './UsageStylePicker';
import {MenuBarSettings} from './MenuBarSettings';

/** Settings that apply to the whole app. Anything that belongs to one account lives in that account's settings. */
export function GeneralSettings({state,send,t,busy,language,densityPreference,usageStylePreference,platform,openAccounts}:{platform:string;densityPreference:ReturnType<typeof useDensity>;usageStylePreference:ReturnType<typeof useHomeUsageStyle>;state:DesktopState;send:Send;t:Copy;busy:boolean;language:string;openAccounts:()=>void}) {
 const tr=(s:string)=>providerText(s,language),{pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const settings=(value:unknown)=>void change({method:'settings',value});

 return <div className="general-preferences">
  {notice}
  {densityPreference.failed&&<p role="alert" className="inline-error">{t.failed}</p>}
  {usageStylePreference.error&&<p role="alert" className="inline-error">{tr(usageStylePreference.error)}</p>}
  <Group title={tr('Appearance and Language')}>
   <SelectRow label={t.appearance} value={state.settings.appearance} disabled={disabled} options={['system','light','dark'].map(value=>({value,label:t[value as 'system']}))} onValueChange={appearance=>settings({appearance})}/>
   <SelectRow label={t.language} value={state.settings.language} disabled={disabled} options={[{value:'system',label:t.system},{value:'en',label:'English'},{value:'zh-Hans',label:'简体中文'},{value:'zh-Hant',label:'繁體中文'},{value:'ja',label:'日本語'},{value:'ko',label:'한국어'}]} onValueChange={language=>settings({language})}/>
  </Group>
  <Group title={tr('Home Page')}>
   <UsageStylePicker value={usageStylePreference.style} onChange={usageStylePreference.changeStyle} tr={tr}/>
   <SelectRow label={tr('Density')} value={densityPreference.density} options={[{value:'compact',label:tr('Compact')},{value:'comfortable',label:tr('Comfortable')}]} onValueChange={value=>densityPreference.changeDensity(value as Density)}/>
   <ToggleRow label={t.showRemaining} checked={state.settings.showRemaining} disabled={disabled} onCheckedChange={showRemaining=>settings({showRemaining})}/>
  </Group>
  {platform==='macos'&&<MenuBarSettings state={state} t={t} tr={tr} language={language} disabled={disabled} change={change} openAccounts={openAccounts}/>}
  <Group title={tr('Data Refresh')}>
   <ToggleRow label={t.autoRefresh} checked={state.settings.autoRefresh} disabled={disabled} onCheckedChange={autoRefresh=>settings({autoRefresh})}/>
   {state.settings.autoRefresh&&<SelectRow label={t.interval} value={String(state.settings.refreshMinutes)} disabled={disabled} options={[1,2,5,10,15,30,60].map(n=>({value:String(n),label:`${n} ${tr('Minutes')}`}))} onValueChange={v=>settings({refreshMinutes:Number(v)})}/>}
  </Group>
  <div className="system-preferences"><SystemSettings state={state} send={send} busy={disabled}/></div>
 </div>;
}
