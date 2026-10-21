import {useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {MetricRow} from '../Metrics';
import {providerText} from '../providerText';
import type {Account,DesktopState,Metric,Send} from '../desktop';
import type {Copy} from '../copy';
import {HistorySummary,isHistoryMetric} from './HistoryPage';
import {AccountConfiguration} from './AccountConfiguration';

export function AccountDetail({account,tab,onTab,history,send,t,busy,language,now,remaining,missing,traySettings,badge}:{badge?:number|null;traySettings:DesktopState['settings'];account:Account;tab:string;onTab:(tab:string)=>void;history:(range:string)=>void;send:Send;t:Copy;busy:boolean;language:string;now:number;remaining:boolean;missing:string}) {
 const tr=(s:string)=>providerText(s,language),[range,setRange]=useState('30');
 const metrics=account.metrics.filter(m=>m.placement!=='hidden'&&!isHistoryMetric(m.id));
 const quota=metrics.filter(m=>m.unit==='percent'||m.percent!=null||m.periodSeconds!=null),other=metrics.filter(m=>!quota.includes(m));
 const row=(m:Metric)=><div key={m.id}><MetricRow metric={{...m,expiries:[],percent:m.unit==='percent'&&!m.hasData?0:m.percent}} now={now} missing={missing} language={language} remaining={remaining}/>{m.expiries.length>0&&<details className="expiry-details"><summary>{t.expires} · {m.expiries.length}</summary><ul>{m.expiries.map((date,i)=><li key={i}>{new Date(date).toLocaleString(language,{dateStyle:'medium',timeStyle:'short'})}</li>)}</ul></details>}</div>;
 return <div className="account-detail">
  {(account.email||account.plan)&&<div className="detail-identity">{account.email&&<span>{account.email}</span>}{account.plan&&<span className="plan-tag">{account.plan}</span>}</div>}
  <nav className="segments preview-segments detail-tabs" aria-label={account.name}>
   <Button size="sm" variant={tab==='usage'?'secondary':'ghost'} aria-pressed={tab==='usage'} onClick={()=>onTab('usage')}>{t.usage}</Button>
   <Button size="sm" variant={tab==='settings'?'secondary':'ghost'} aria-pressed={tab==='settings'} onClick={()=>onTab('settings')}>{tr('Settings')}</Button>
  </nav>
  <div hidden={tab!=='usage'}>
   {account.error&&<p role="status" className="inline-error">{tr(account.error)}</p>}
   {quota.length>0&&<section className="detail-group"><h2>{tr('Current Quota')}</h2>{quota.map(row)}</section>}
   {other.length>0&&<section className="detail-group"><h2>{tr('Balance and Benefits')}</h2>{other.map(row)}</section>}
   <section className="detail-group history-overview"><div className="section-heading"><h2>{t.history}</h2><Button variant="ghost" size="sm" onClick={()=>history(range)}>{tr('View History')}<ChevronRight size={15}/></Button></div><HistorySummary accounts={[account]} t={t} language={language} range={range} onRange={setRange}/></section>
   {account.note&&<section className="detail-group"><h2>{t.note}</h2><p>{account.note}</p></section>}
   {account.fetchedAt&&<p className="last-updated">{tr('Last Updated')} {new Date(account.fetchedAt).toLocaleTimeString(language,{hour:'2-digit',minute:'2-digit'})}</p>}
  </div>
  <div hidden={tab!=='settings'}><AccountConfiguration badge={badge} traySettings={traySettings} account={account} send={send} t={t} busy={busy} language={language}/></div>
 </div>;
}
