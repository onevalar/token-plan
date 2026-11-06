import type {CSSProperties} from 'react';
import {providerTheme} from './providerTheme';
import {ChevronRight} from 'lucide-react';
import {Button} from './components/arc/button/button';
import type {Account} from './desktop';
import {accountTitle} from './usage';
import {providerText} from './providerText';
import {HomeMetrics,type HomeUsageStyle} from './HomeMetrics';
import type {SourceShare} from './HomeExtraStyles';
import {connectionAction} from './connection';
import './dashboard.css';

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
/** OpenAI occupies its first visible account's position; stored account order is untouched. */
export function dashboardGroups(accounts:Account[]) {
 const visible=accounts.filter(a=>a.enabled);
 const isOpenAI=(a:Account)=>a.family==='codex'||a.family==='openai';
 const first=visible.findIndex(isOpenAI);
 const groups:{openAI:boolean;accounts:Account[]}[]=[];
 let pending:Account[]=[];
 const flush=()=>{if(pending.length){groups.push({openAI:false,accounts:pending});pending=[];}};
 visible.forEach((account,index)=>{
  if(index===first){flush();groups.push({openAI:true,accounts:visible.filter(isOpenAI)});}
  if(!isOpenAI(account))pending.push(account);
 });
 flush();return groups;
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
/** Each model's share of the account's tokens over its last seven days of history; empty when no model split exists. */
export function modelShares(history:Account['history']):SourceShare[] {
 const days=[...history].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,7),totals=new Map<string,number>();
 for(const d of days)for(const m of d.models)totals.set(m.model,(totals.get(m.model)??0)+m.tokens);
 const sum=[...totals.values()].reduce((n,v)=>n+v,0);
 return sum>0?[...totals].filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).map(([name,v])=>({name,share:v/sum})):[];
}
export function Dashboard({accounts,open,openSettings,retry,busy=false,now,language,missing,remaining,usageStyle='bars',accountStyle}:{accounts:Account[];open:(id:string)=>void;openSettings:(id:string)=>void;retry:(id:string)=>void;busy?:boolean;now:number;language:string;missing:string;remaining:boolean;usageStyle?:HomeUsageStyle;accountStyle?:(id:string)=>HomeUsageStyle}) {
 const renderAccounts=(items:Account[],openAI=false)=>accountGroups(items).map(group=><section className={`provider${openAI?'':' service-group'}`} data-provider={group.family} data-multiple={group.accounts.length>1} style={providerTheme(group.family)} key={group.accounts[0].id}>
  {group.accounts.length>1&&<div className="family-heading"><ProviderLogo family={group.family}/><h2>{openAI?(group.family==='codex'?'Codex':'API'):group.accounts[0].name}</h2></div>}
  {group.accounts.map(a=><div className="account-block" data-usage-style={accountStyle?.(a.id)??usageStyle} key={a.id}>
   <div className="provider-heading">
    <Button variant="ghost" className="account-identity account-detail-entry" aria-label={`${a.name} ${a.email}`.trim()} onClick={()=>open(a.id)}>
     {!openAI&&group.accounts.length===1&&<ProviderLogo family={a.family}/>}
     <div className="identity-text">
      <div className="identity-line"><h2>{group.accounts.length>1?accountTitle(a.email)||a.name:openAI?(a.family==='codex'?'Codex':'API'):a.name}</h2><span className="plan">{a.plan}</span></div>
      {group.accounts.length===1&&a.email&&<span className="email">{accountTitle(a.email)}</span>}
     </div>
     <ChevronRight className="account-chevron" size={18} aria-hidden="true"/>
    </Button>
   </div>
   {(a.error||a.warning)&&<div className="notice-block"><p role="status" className="notice">{providerText(a.error||a.warning||"",language)}</p>{(()=>{const action=problemAction(a,{open,settings:openSettings,retry});return action&&<Button size="sm" variant="secondary" className="notice-action" disabled={busy} onClick={action.run}>{providerText(action.label,language)}</Button>;})()}</div>}
   <HomeMetrics sources={modelShares(a.history)} metrics={a.metrics.filter(m=>m.placement==='home')} style={accountStyle?.(a.id)??usageStyle} now={now} missing={missing} language={language} remaining={remaining}/>
  </div>)}
 </section>);
 return <div className="dashboard" data-usage-style={usageStyle}>
  {dashboardGroups(accounts).map(group=>group.openAI?<section className="openai-group service-group" aria-label="OpenAI" key="openai-group">
   <div className="family-heading openai-heading"><ProviderLogo family="openai"/><h2>OpenAI</h2></div>
   {renderAccounts(['codex','openai'].flatMap(family=>group.accounts.filter(a=>a.family===family)),true)}
  </section>:<div className="dashboard-group" key={group.accounts[0].id}>{renderAccounts(group.accounts)}</div>)}
 </div>;
}
