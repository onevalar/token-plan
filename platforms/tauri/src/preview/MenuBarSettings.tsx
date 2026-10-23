import {ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Switch} from '../components/arc/switch/switch';
import {metricName} from '../Metrics';
import {trayAccounts,type DesktopState,type Request} from '../desktop';
import type {Copy} from '../copy';
import {TrayGlyph,RingLayoutPicker} from './TrayPreview';
import {Group,SelectRow} from './shared';

const MAX_PINNED=3;

/** Everything about the menu bar lives here: what it looks like, which accounts appear and which metrics each one shows. */
export function MenuBarSettings({state,t,tr,language,disabled,change,openAccounts}:{state:DesktopState;t:Copy;tr:(s:string)=>string;language:string;disabled:boolean;change:(request:Request)=>Promise<boolean>;openAccounts:()=>void}) {
 const {trayStyle,ringIconPosition}=state.settings;
 const shown=trayAccounts(state.accounts),enabled=state.accounts.filter(a=>a.enabled);
 const percentOnly=(metrics:{percent:number|null;unit:string}[])=>metrics.every(m=>m.percent!=null||m.unit==='percent');
 const pinnedOf=(a:DesktopState['accounts'][number])=>a.metrics.filter(m=>m.pinned).slice(0,MAX_PINNED);
 const threeRings=trayStyle==='ring'&&shown.some(a=>{const p=pinnedOf(a);return p.length===MAX_PINNED&&percentOnly(p);});
 const values=trayStyle==='ring'&&shown.some(a=>{const p=pinnedOf(a);return p.length>0&&!percentOnly(p);});
 return <Group title={tr('Menu Bar')}>
  <div className="menu-bar-preview" aria-label={tr('Menu Bar Preview')}>
   {shown.map(a=><TrayGlyph key={a.id} family={a.family} badge={a.badge} metrics={pinnedOf(a)} style={trayStyle} position={ringIconPosition}/>)}
   {!shown.length&&<span className="muted">{tr('No accounts are shown in the menu bar yet.')}</span>}
  </div>
  {(threeRings||values)&&<p className="menu-bar-hint">{tr(threeRings?'Three rings use the left icon layout.':'Metrics without a percentage are shown as values.')}</p>}
  <SelectRow label={tr('Menu Bar Style')} value={trayStyle} disabled={disabled} options={[{value:'ring',label:t.ring},{value:'percentage',label:t.percentage}]} onValueChange={value=>void change({method:'settings',value:{trayStyle:value}})}/>
  {trayStyle==='ring'&&<RingLayoutPicker value={ringIconPosition} disabled={disabled} tr={tr} onChange={value=>void change({method:'settings',value:{ringIconPosition:value}})}/>}
  {enabled.length>0&&<div className="menu-bar-accounts">
   <div className="menu-bar-accounts-heading"><h3>{tr('Accounts in the Menu Bar')}</h3><span>{tr('Up to three metrics each')}</span></div>
   {enabled.map(a=>{
    const label=a.email?`${a.name} · ${a.email}`:a.name,pinnable=a.metrics.filter(m=>m.pinnable),count=a.metrics.filter(m=>m.pinned).length;
    return <div className="menu-bar-account" data-on={a.tray} key={a.id}>
     <Switch label={label} checked={a.tray} disabled={disabled} onCheckedChange={value=>void change({method:'tray',accountId:a.id,value})}/>
     {a.tray&&(pinnable.length?<div className="metric-chips" role="group" aria-label={`${label} · ${tr('Menu Bar')}`}>
      {pinnable.map(m=><button type="button" className="metric-chip" key={m.id} aria-pressed={m.pinned} disabled={disabled||!m.pinned&&count>=MAX_PINNED} onClick={()=>void change({method:'metric',accountId:a.id,metricId:m.id,value:{pinned:!m.pinned}})}>{metricName(m,language)}</button>)}
     </div>:<p className="menu-bar-account-note">{tr('No usage metrics are available yet.')}</p>)}
    </div>;
   })}
   <div className="linked-setting"><span>{tr('Same order as Account Management')}</span><Button size="sm" variant="ghost" onClick={openAccounts}>{tr('Adjust Order')}<ChevronRight size={14} aria-hidden="true"/></Button></div>
  </div>}
 </Group>;
}
