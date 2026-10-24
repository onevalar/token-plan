import {ChevronRight,Plus,Minus} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Switch} from '../components/arc/switch/switch';
import {metricName} from '../Metrics';
import {trayAccounts,type DesktopState,type Request} from '../desktop';
import type {Copy} from '../copy';
import {trayTrends,type TokenTrend} from '../trayTrend';
import {TrayGlyph,RingLayoutPicker} from './TrayPreview';
import {Group,SelectRow} from './shared';

const MAX_PINNED=3;

/** Everything about the menu bar lives here: what it looks like, which accounts appear and which metrics each one shows. */
export function MenuBarSettings({state,t,tr,language,now,disabled,change,openAccounts}:{state:DesktopState;t:Copy;tr:(s:string)=>string;language:string;now:number;disabled:boolean;change:(request:Request)=>Promise<boolean>;openAccounts:()=>void}) {
 const {trayStyle,ringIconPosition}=state.settings;
 const shown=trayAccounts(state.accounts),enabled=state.accounts.filter(a=>a.enabled);
 const trends=trayStyle==='sparkline'?trayTrends(state.accounts,now):new Map<string,TokenTrend>();
 const percentOnly=(metrics:{percent:number|null;unit:string}[])=>metrics.every(m=>m.percent!=null||m.unit==='percent');
 const pinnedOf=(a:DesktopState['accounts'][number])=>a.metrics.filter(m=>m.pinned).slice(0,MAX_PINNED);
 const threeRings=trayStyle==='ring'&&shown.some(a=>{const p=pinnedOf(a);return p.length===MAX_PINNED&&percentOnly(p);});
 const values=trayStyle==='ring'&&shown.some(a=>{const p=pinnedOf(a);return p.length>0&&!percentOnly(p);});
 return <Group title={tr('Menu Bar')}>
  <div className="menu-bar-preview" aria-label={tr('Menu Bar Preview')}>
   {shown.map(a=><TrayGlyph key={a.id} family={a.family} badge={a.badge} metrics={pinnedOf(a)} style={trayStyle} position={ringIconPosition} trend={trends.get(a.id)} tokensLabel={tr('tokens')}/>)}
   {!shown.length&&<span className="muted">{tr('No accounts are shown in the menu bar yet.')}</span>}
  </div>
  {(threeRings||values)&&<p className="menu-bar-hint">{tr(threeRings?'Three rings use the left icon layout.':'Metrics without a percentage are shown as values.')}</p>}
  {trayStyle==='sparkline'&&<div className="menu-bar-trend-help">
   <p>{tr('The line shows recorded daily tokens over the last 14 days, including today. The top value is today’s tokens; your selected current readings stay below.')}</p>
   <p>{tr('Missing days stay blank. Without recent records, only selected values appear. Device history appears once per provider. An asterisk marks partial or invalid history.')}</p>
   {Array.from(trends.values()).some(trend=>trend.invalid)&&<p role="status">{tr('Invalid or duplicate token records are omitted.')}</p>}
  </div>}
  <SelectRow label={tr('Menu Bar Style')} value={trayStyle} disabled={disabled} options={[{value:'ring',label:t.ring},{value:'percentage',label:t.percentage},{value:'sparkline',label:tr('Token Trend + Values')}]} onValueChange={value=>void change({method:'settings',value:{trayStyle:value}})}/>
  {trayStyle==='ring'&&<RingLayoutPicker value={ringIconPosition} disabled={disabled} tr={tr} onChange={value=>void change({method:'settings',value:{ringIconPosition:value}})}/>}
  {enabled.length>0&&<div className="menu-bar-accounts">
   <div className="menu-bar-accounts-heading"><h3>{tr('Accounts in the Menu Bar')}</h3><span>{tr('Up to three metrics each')}</span></div>
   {enabled.map(a=>{
    const label=a.email?`${a.name} · ${a.email}`:a.name,pinnable=a.metrics.filter(m=>m.pinnable),count=a.metrics.filter(m=>m.pinned).length;
    return <div className="menu-bar-account" data-on={a.tray} key={a.id}>
     <Switch label={label} checked={a.tray} disabled={disabled} onCheckedChange={value=>void change({method:'tray',accountId:a.id,value})}/>
     {a.tray&&(pinnable.length?<div className="metric-chips" role="group" aria-label={`${label} · ${tr('Menu Bar')}`}>
      {pinnable.map(m=><Button size="sm" variant="secondary" type="button" className="metric-chip" key={m.id} aria-pressed={m.pinned} disabled={disabled||!m.pinned&&count>=MAX_PINNED} onClick={()=>void change({method:'metric',accountId:a.id,metricId:m.id,value:{pinned:!m.pinned}})} aria-label={`${tr(m.pinned?'Remove':'Add')} · ${metricName(m,language)}`}>{m.pinned?<Minus size={13} aria-hidden="true"/>:<Plus size={13} aria-hidden="true"/>}{metricName(m,language)}</Button>)}
     </div>:<p className="menu-bar-account-note">{tr('No usage metrics are available yet.')}</p>)}
    </div>;
   })}
   <div className="linked-setting"><span>{tr('Same order as Subscription Management')}</span><Button size="sm" variant="ghost" onClick={openAccounts}>{tr('Adjust Order')}<ChevronRight size={14} aria-hidden="true"/></Button></div>
  </div>}
 </Group>;
}
