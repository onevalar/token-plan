import {providerTheme} from '../providerTheme';
import {connectionAction} from '../connection';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AccountOnboarding} from './AccountOnboarding';
import {ChevronRight,Pencil} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {MetricRow} from '../Metrics';
import {providerText} from '../providerText';
import type {Account,Metric,Send} from '../desktop';
import {problemAction} from '../Dashboard';
import type {Copy} from '../copy';
import {HistorySummary,isHistoryMetric} from './HistoryPage';
import {AccountConfiguration,type AccountDraft} from './AccountConfiguration';
import {BenefitMetrics} from './BenefitMetrics';
import {HomeMetricEditor} from './HomeMetricEditor';
import type {useHomeUsageStyle} from './useHomeUsageStyle';

export function AccountDetail({account,usageStylePreference,onSetupChange,focusManagement,editing,onEditing,history,send,t,busy,language,now,remaining,missing,retry,draft,onDraftChange}:{onSetupChange:()=>Promise<void>;usageStylePreference:ReturnType<typeof useHomeUsageStyle>;focusManagement?:boolean;draft:AccountDraft;onDraftChange:(patch:AccountDraft)=>void;retry:(id:string)=>void;account:Account;editing:boolean;onEditing:(editing:boolean)=>void;history:(range:string)=>void;send:Send;t:Copy;busy:boolean;language:string;now:number;remaining:boolean;missing:string}) {
 const tr=(s:string)=>providerText(s,language),[range,setRange]=useState('30');
 const root=useRef<HTMLDivElement>(null),wasEditing=useRef(false);
 useLayoutEffect(()=>{if(editing){root.current?.closest('.preview-page')?.scrollTo(0,0);root.current?.querySelector<HTMLElement>('.home-metric-editor')?.focus({preventScroll:true});}else if(wasEditing.current){root.current?.querySelector<HTMLButtonElement>('.edit-home-button')?.focus();}wasEditing.current=editing;},[editing]);
 const management=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(focusManagement){management.current?.scrollIntoView({block:'start'});management.current?.querySelector<HTMLInputElement>('input[type=password]')?.focus();}},[focusManagement]);
 const metrics=account.metrics.filter(m=>m.placement!=='hidden'&&!isHistoryMetric(m.id));
 const quota=metrics.filter(m=>m.unit==='percent'||m.percent!=null||m.periodSeconds!=null),other=metrics.filter(m=>!quota.includes(m));
 // The detail page already shows sign-in help and every detail, so only the steps that lead somewhere else get a button.
 const nextStep=(()=>{const action=problemAction(account,{open:()=>{},settings:()=>{management.current?.scrollIntoView({block:'start'});management.current?.querySelector<HTMLInputElement>('input[type=password]')?.focus();},retry});return action&&['Set API Key','Try Again'].includes(action.label)?action:null;})();
 const row=(m:Metric)=><div key={m.id}><MetricRow metric={{...m,expiries:[],percent:m.unit==='percent'&&!m.hasData?0:m.percent}} now={now} missing={missing} language={language} remaining={remaining}/>{m.expiries.length>0&&<details className="expiry-details"><summary>{t.expires} · {m.expiries.length}</summary><ul>{m.expiries.map((date,i)=><li key={i}>{new Date(date).toLocaleString(language,{dateStyle:'medium',timeStyle:'short'})}</li>)}</ul></details>}</div>;
 return <div ref={root} className="account-detail" data-provider={account.family} style={providerTheme(account.family)}>
  {(account.email||account.plan)&&<div className="detail-identity">{account.email&&<span>{account.email}</span>}{account.plan&&<span className="plan-tag">{account.plan}</span>}</div>}
  {!editing&&['inspect','login'].includes(connectionAction(account))&&['claude','codex'].includes(account.family)&&<AccountOnboarding onSetupChange={onSetupChange} send={send} busy={busy} language={language} family={account.family} loginDirectories={account.loginDirectories} targetId={account.id}/>}
  {editing?<HomeMetricEditor usageStylePreference={usageStylePreference} account={account} send={send} t={t} busy={busy} language={language} finish={()=>onEditing(false)}/>:<div>
   {account.error&&<div className="notice-block detail-notice"><p role="status" className="inline-error">{tr(account.error)}</p>{nextStep&&<Button size="sm" variant="secondary" className="notice-action" disabled={busy} onClick={nextStep.run}>{tr(nextStep.label)}</Button>}</div>}{!account.error&&account.warning&&<p role="status" className="group-description">{tr(account.warning)}</p>}
   {quota.length>0&&<section className="detail-group"><h2>{tr('Current Quota')}</h2>{quota.map(row)}</section>}
   {other.length>0&&<section className="detail-group"><h2>{tr('Balance and Benefits')}</h2><BenefitMetrics metrics={other} now={now} missing={missing} language={language} remaining={remaining}/></section>}
   <section className="detail-group history-overview"><div className="section-heading"><h2>{t.history}</h2><Button variant="ghost" size="sm" onClick={()=>history(range)}>{tr('View History')}<ChevronRight size={15}/></Button></div><HistorySummary accounts={[account]} t={t} language={language} range={range} onRange={setRange}/></section>
   {account.metrics.length>0&&<Button className="edit-home-button" size="sm" variant="secondary" disabled={busy} onClick={()=>onEditing(true)}><Pencil size={15} aria-hidden="true"/>{tr('Edit Home Display')}</Button>}
   <div ref={management}><AccountConfiguration draft={draft} onDraftChange={onDraftChange} account={account} send={send} t={t} busy={busy} language={language}/></div>
  </div>}
 </div>;
}
