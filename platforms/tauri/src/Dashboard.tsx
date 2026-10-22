import type {CSSProperties} from 'react';
import {providerTheme} from './providerTheme';
import {ChevronRight,SlidersHorizontal} from 'lucide-react';
import {Button} from './components/arc/button/button';
import type {Account} from './desktop';
import {accountTitle} from './usage';
import {providerText} from './providerText';
import {MetricRow} from './Metrics';
import {connectionAction} from './connection';

export function ProviderLogo({family}:{family:string}) {
 return <span aria-hidden="true" className="provider-logo" data-provider={family} style={{...providerTheme(family),maskImage:`url("/providers/${family}.svg")`,WebkitMaskImage:`url("/providers/${family}.svg")`} as CSSProperties}/>;
}
export function accountGroups(accounts:Account[]) {
 const groups:{family:string;accounts:Account[]}[]=[];
 for(const account of accounts.filter(a=>a.enabled)){
  const last=groups.at(-1);
  if(last?.family===account.family)last.accounts.push(account);
  else groups.push({family:account.family,accounts:[account]});
 }
 return groups;
}
/** The one next step for an account that has a problem, so the card can offer a button instead of only describing it. */
export function problemAction(a:Account,run:{open:(id:string)=>void;settings:(id:string)=>void;retry:(id:string)=>void}):{label:string;run:()=>void}|null {
 if(!a.error)return null;
 const kind=connectionAction(a);
 if(a.apiKey&&/\bkey\b/i.test(a.error))return {label:'Set API Key',run:()=>run.settings(a.id)};
 if(kind==='retry')return {label:'Try Again',run:()=>run.retry(a.id)};
 if(kind==='login'&&['claude','codex'].includes(a.family))return {label:'Sign In Again',run:()=>run.open(a.id)};
 if(kind==='inspect')return {label:'Check Connection',run:()=>run.open(a.id)};
 return {label:'View Details',run:()=>run.open(a.id)};
}
export function Dashboard({accounts,open,openSettings,retry,busy=false,now,language,missing,remaining}:{accounts:Account[];open:(id:string)=>void;openSettings:(id:string)=>void;retry:(id:string)=>void;busy?:boolean;now:number;language:string;missing:string;remaining:boolean}) {
 return <div className="dashboard">{accountGroups(accounts).map(group=><section className="provider" data-provider={group.family} style={providerTheme(group.family)} key={group.accounts[0].id}>
  {group.accounts.length>1&&<div className="family-heading"><ProviderLogo family={group.family}/><h2>{group.accounts[0].name}</h2></div>}
  {group.accounts.map(a=><div className="account-block" key={a.id}>
   <div className="provider-heading">
    <div className="account-identity">
     {group.accounts.length===1&&<ProviderLogo family={a.family}/>}
     <div className="identity-text">
      <div className="identity-line"><h2>{group.accounts.length>1?accountTitle(a.email)||a.name:a.name}</h2><span className="plan">{a.plan}</span></div>
      {group.accounts.length===1&&a.email&&<span className="email">{accountTitle(a.email)}</span>}
     </div>
    </div>
    <div className="heading-actions">
     <Button size="sm" className="settings-button" variant="ghost" aria-label={`${providerText('Account Settings',language)} ${a.name} ${a.email}`.trim()} title={providerText('Account Settings',language)} onClick={()=>openSettings(a.id)}><SlidersHorizontal size={15}/></Button>
     <Button size="sm" className="detail-button" variant="ghost" aria-label={`${a.name} ${a.email}`} onClick={()=>open(a.id)}><ChevronRight size={18}/></Button>
    </div>
   </div>
   {(a.error||a.warning)&&<div className="notice-block"><p role="status" className="notice">{providerText(a.error||a.warning||"",language)}</p>{(()=>{const action=problemAction(a,{open,settings:openSettings,retry});return action&&<Button size="sm" variant="secondary" className="notice-action" disabled={busy} onClick={action.run}>{providerText(action.label,language)}</Button>;})()}</div>}
   {a.metrics.filter(m=>m.placement==='home').map(m=><MetricRow key={m.id} metric={m} now={now} missing={missing} language={language} remaining={remaining}/>)}
  </div>)}
 </section>)}</div>;
}
