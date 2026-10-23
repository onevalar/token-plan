import {providerTheme} from '../providerTheme';
import {connectionAction} from '../connection';
import {useState} from 'react';
import {AccountOnboarding} from './AccountOnboarding';
import {ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {MetricRow} from '../Metrics';
import {providerText} from '../providerText';
import type {Account,Metric,Send} from '../desktop';
import type {HomeUsageStyle} from '../homeUsage';
import {problemAction} from '../Dashboard';
import type {Copy} from '../copy';
import {HistorySummary,isHistoryMetric} from './HistoryPage';
import {AccountConfiguration,type AccountDraft} from './AccountConfiguration';
import {BenefitMetrics} from './BenefitMetrics';

export function AccountDetail({platform,account,tab,onTab,history,send,t,busy,language,now,remaining,missing,usageStyle,openGeneral,retry,draft,onDraftChange}:{platform:string;draft:AccountDraft;onDraftChange:(patch:AccountDraft)=>void;usageStyle:HomeUsageStyle;openGeneral:()=>void;retry:(id:string)=>void;account:Account;tab:string;onTab:(tab:string)=>void;history:(range:string)=>void;send:Send;t:Copy;busy:boolean;language:string;now:number;remaining:boolean;missing:string}) {
 const tr=(s:string)=>providerText(s,language),[range,setRange]=useState('30');
 const metrics=account.metrics.filter(m=>m.placement!=='hidden'&&!isHistoryMetric(m.id));
 const quota=metrics.filter(m=>m.unit==='percent'||m.percent!=null||m.periodSeconds!=null),other=metrics.filter(m=>!quota.includes(m));
 // The detail page already shows sign-in help and every detail, so only the steps that lead somewhere else get a button.
 const nextStep=(()=>{const action=problemAction(account,{open:()=>{},settings:()=>onTab('settings'),retry});return action&&['Set API Key','Try Again'].includes(action.label)?action:null;})();
 const row=(m:Metric)=><div key={m.id}><MetricRow metric={{...m,expiries:[],percent:m.unit==='percent'&&!m.hasData?0:m.percent}} now={now} missing={missing} language={language} remaining={remaining}/>{m.expiries.length>0&&<details className="expiry-details"><summary>{t.expires} · {m.expiries.length}</summary><ul>{m.expiries.map((date,i)=><li key={i}>{new Date(date).toLocaleString(language,{dateStyle:'medium',timeStyle:'short'})}</li>)}</ul></details>}</div>;
 return <div className="account-detail" data-provider={account.family} style={providerTheme(account.family)}>
  {(account.email||account.plan)&&<div className="detail-identity">{account.email&&<span>{account.email}</span>}{account.plan&&<span className="plan-tag">{account.plan}</span>}</div>}
  {['inspect','login'].includes(connectionAction(account))&&['claude','codex'].includes(account.family)&&<AccountOnboarding send={send} busy={busy} language={language} family={account.family} targetId={account.id}/>}
  <nav className="segments preview-segments detail-tabs" aria-label={account.name}>
   <Button size="sm" variant={tab==='usage'?'secondary':'ghost'} aria-pressed={tab==='usage'} onClick={()=>onTab('usage')}>{t.usage}</Button>
   <Button size="sm" variant={tab==='settings'?'secondary':'ghost'} aria-pressed={tab==='settings'} onClick={()=>onTab('settings')}>{tr('Account Settings')}</Button>
  </nav>
  <div hidden={tab!=='usage'}>
   {account.error&&<div className="notice-block detail-notice"><p role="status" className="inline-error">{tr(account.error)}</p>{nextStep&&<Button size="sm" variant="secondary" className="notice-action" disabled={busy} onClick={nextStep.run}>{tr(nextStep.label)}</Button>}</div>}{!account.error&&account.warning&&<p role="status" className="group-description">{tr(account.warning)}</p>}
   {quota.length>0&&<section className="detail-group"><h2>{tr('Current Quota')}</h2>{quota.map(row)}</section>}
   {other.length>0&&<section className="detail-group"><h2>{tr('Balance and Benefits')}</h2><BenefitMetrics metrics={other} now={now} missing={missing} language={language} remaining={remaining}/></section>}
   <section className="detail-group history-overview"><div className="section-heading"><h2>{t.history}</h2><Button variant="ghost" size="sm" onClick={()=>history(range)}>{tr('View History')}<ChevronRight size={15}/></Button></div><HistorySummary accounts={[account]} t={t} language={language} range={range} onRange={setRange}/></section>
   {account.note&&<section className="detail-group"><h2>{t.note}</h2><p>{account.note}</p></section>}
   {account.metrics.length>0&&<Button className="placement-link" size="sm" variant="ghost" onClick={()=>onTab('settings')}>{tr('Choose Which Metrics Appear on Home')}<ChevronRight size={14} aria-hidden="true"/></Button>}
   {account.fetchedAt&&<p className="last-updated">{tr('Last Updated')} {new Date(account.fetchedAt).toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'})}</p>}
  </div>
  <div hidden={tab!=='settings'}><AccountConfiguration platform={platform} draft={draft} onDraftChange={onDraftChange} usageStyle={usageStyle} openGeneral={openGeneral} account={account} send={send} t={t} busy={busy} language={language}/></div>
 </div>;
}
