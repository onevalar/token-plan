import {useState} from 'react';
import {Bell,X} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {providerText} from '../providerText';
import type {DesktopState,Send} from '../desktop';

// One-time hints. Whether they were dismissed is a per-device convenience, so it lives in the webview's own storage and a
// blocked or cleared store simply shows the hint again.
const WELCOME='tokenplan.tip.welcome',ALERTS='tokenplan.tip.alerts';
const seen=(key:string)=>{try{return localStorage.getItem(key)==='1';}catch{return false;}};
const remember=(key:string)=>{try{localStorage.setItem(key,'1');}catch{/* shown again next time */}};

/** A short welcome for first-time use, then a single nudge to turn on alerts once an account is getting close to a limit. */
export function HomeTips({state,send,language,addAccount}:{state:DesktopState;send:Send;language:string;addAccount:()=>void}) {
 const tr=(s:string)=>providerText(s,language);
 const [welcome,setWelcome]=useState(()=>!seen(WELCOME)),[alerts,setAlerts]=useState(()=>!seen(ALERTS));
 const [pending,setPending]=useState(false),[error,setError]=useState('');
 const hasAccounts=state.accounts.some(a=>a.enabled);
 const alertsOff=state.settings.notifications.every(on=>!on);
 const nearLimit=state.accounts.some(a=>a.enabled&&a.metrics.some(m=>m.placement==='home'&&m.hasData&&m.percent!=null&&m.percent>=70));
 const closeWelcome=()=>{remember(WELCOME);setWelcome(false);};
 const closeAlerts=()=>{remember(ALERTS);setAlerts(false);};
 const turnOn=async()=>{
  setPending(true);setError('');
  try{await send({method:'notificationPermission'});await send({method:'settings',value:{notifications:[true,true,true]}});closeAlerts();}
  catch{setError(tr('Allow TokenPlan notifications in system settings, then try again.'));}
  finally{setPending(false);}
 };
 if(hasAccounts&&welcome)return <section className="tip-card" aria-label={tr('Welcome to TokenPlan')}>
  <div className="tip-heading"><h2>{tr('Welcome to TokenPlan')}</h2><Button size="sm" variant="ghost" className="tip-close" aria-label={tr('Dismiss')} onClick={closeWelcome}><X size={14}/></Button></div>
  <ul>
   <li>{tr('Accounts already signed in on this Mac appear here automatically.')}</li>
   <li>{tr('“5h” and “1w” are usage windows of 5 hours and 1 week. The hourglass shows when each one resets.')}</li>
   <li>{tr('Click an account for details, or use More → Add Account to track another login.')}</li>
  </ul>
  <div className="tip-actions"><Button size="sm" variant="secondary" onClick={()=>{closeWelcome();addAccount();}}>{tr('Add Account')}</Button><Button size="sm" variant="ghost" onClick={closeWelcome}>{tr('Got It')}</Button></div>
 </section>;
 if(hasAccounts&&alerts&&alertsOff&&nearLimit)return <section className="tip-card" aria-label={tr('Get a heads-up before you run out.')}>
  <div className="tip-heading"><h2><Bell size={14} aria-hidden="true"/>{tr('Get a heads-up before you run out.')}</h2><Button size="sm" variant="ghost" className="tip-close" aria-label={tr('Dismiss')} onClick={closeAlerts}><X size={14}/></Button></div>
  <p>{tr('TokenPlan can notify you when a limit is almost used up, or on track to run out before it resets.')}</p>
  {error&&<p className="inline-error" role="alert">{error}</p>}
  <div className="tip-actions"><Button size="sm" variant="secondary" disabled={pending} onClick={()=>void turnOn()}>{tr('Turn On Alerts')}</Button><Button size="sm" variant="ghost" onClick={closeAlerts}>{tr('Not Now')}</Button></div>
 </section>;
 return null;
}
