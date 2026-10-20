import type {CSSProperties} from 'react';
import {ChevronRight} from 'lucide-react';
import {Button} from './components/arc/button/button';
import type {Account} from './desktop';
import {accountTitle} from './usage';
import {providerText} from './providerText';
import {MetricRow} from './Metrics';

export function ProviderLogo({family}:{family:string}) {
 return <span aria-hidden="true" className="provider-logo" style={{maskImage:`url("/providers/${family}.svg")`,WebkitMaskImage:`url("/providers/${family}.svg")`} as CSSProperties}/>;
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
export function Dashboard({accounts,open,now,language,missing,remaining}:{accounts:Account[];open:(id:string)=>void;now:number;language:string;missing:string;remaining:boolean}) {
 return <div className="dashboard">{accountGroups(accounts).map(group=><section className="provider" key={group.accounts[0].id}>
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
    <Button size="sm" className="detail-button" variant="ghost" aria-label={`${a.name} ${a.email}`} onClick={()=>open(a.id)}><ChevronRight size={18}/></Button>
   </div>
   {a.error&&<p role="status" className="notice">{providerText(a.error,language)}</p>}
   {a.metrics.filter(m=>m.placement==='home').map(m=><MetricRow key={m.id} metric={m} now={now} missing={missing} language={language} remaining={remaining}/>)}
  </div>)}
 </section>)}</div>;
}
