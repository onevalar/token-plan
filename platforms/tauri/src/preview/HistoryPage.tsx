import {useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import {providerText} from '../providerText';
import {historyRange,historyBounds,summarizeHistory,dateKey} from '../historyModel';
import {MetricRow} from '../Metrics';
import type {Account} from '../desktop';
import type {Copy} from '../copy';

export const isHistoryMetric=(id:string)=>/(?:^|\.)(today|yesterday|last30|trend)$/.test(id);
const money=(value:number|null,language:string)=>value==null?'—':new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
const number=(value:number,language:string)=>new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(value);
type HistoryProps={accounts:Account[];t:Copy;language:string};

export function HistorySummary({accounts,t,language,range,onRange}:{range:string;onRange:(range:string)=>void}&HistoryProps) {
 const tr=(s:string)=>providerText(s,language),rows=historyRange(accounts,'all',range),total=summarizeHistory(rows);
 const bounds=historyBounds(range);
 const days=Array.from({length:range==='30'?30:1},(_,i)=>{
  const d=new Date(`${bounds.start}T12:00:00`);d.setDate(d.getDate()+i);
  const key=dateKey(d),entries=rows.filter(r=>r.date===key);
  return {key,tokens:entries.length?summarizeHistory(entries).tokens:null};
 });
 const maximum=Math.max(1,...days.map(d=>d.tokens??0));
 const fallback=accounts.length===1?accounts[0].metrics.find(m=>m.id.split('.').at(-1)===({1:'today',yesterday:'yesterday',30:'last30'}[range])):undefined;
 const trend=accounts.length===1&&range==='30'?accounts[0].metrics.find(m=>m.chart.length>0&&isHistoryMetric(m.id)):undefined;
 return <div className="usage-summary">
  <nav className="segments preview-segments" aria-label={tr('Time Range')}>
   {[['1','Today'],['yesterday','Yesterday'],['30','Last 30 Days']].map(([value,label])=><Button size="sm" variant={range===value?'secondary':'ghost'} aria-pressed={range===value} key={value} onClick={()=>onRange(value)}>{tr(label)}</Button>)}
  </nav>
  {rows.length?<>
   <dl className="history-totals"><div><dt>{t.cost}</dt><dd>{money(total.cost,language)}</dd></div><div><dt>{t.tokens}</dt><dd>{number(total.tokens,language)}</dd></div></dl>
   {range==='30'&&<div className="daily-trend"><div className="trend-bars" role="img" aria-label={tr('Daily Token Usage')}>{days.map(d=><span key={d.key} data-missing={d.tokens==null} style={{height:d.tokens==null?'0':`${Math.max(2,(d.tokens/maximum)*100)}%`}}/>)}</div><div className="trend-caption"><span>{tr('Daily Token Usage')}</span><span>{bounds.start.slice(5)} — {bounds.end.slice(5)}</span></div></div>}
  </>:fallback?.hasData||trend?<div className="history-fallback">{fallback?.hasData&&<MetricRow metric={fallback} now={Date.now()} missing={t.noHistory} language={language}/>} {trend&&<MetricRow metric={trend} now={Date.now()} missing={t.noHistory} language={language}/>}</div>:<p className="empty-state">{t.noHistory}</p>}
  {(accounts.some(a=>a.historyPartial)||rows.some(r=>r.cost==null)&&total.cost!=null)&&<p className="notice" role="status">{t.historyWarning}</p>}
 </div>;
}

export function HistoryPage({accounts,t,language,initialRange='30'}:HistoryProps&{initialRange?:string}) {
 const tr=(s:string)=>providerText(s,language);
 const [scope,setScope]=useState('all'),[range,setRange]=useState(initialRange),[page,setPage]=useState(0);
 const [expanded,setExpanded]=useState<string|null>(null),[modelRow,setModelRow]=useState<string|null>(null);
 const [showQuota,setShowQuota]=useState(false),[quotaPage,setQuotaPage]=useState(0);
 const scoped=scope==='all'?accounts:accounts.filter(a=>a.id===scope),rows=historyRange(scoped,'all',range);
 const days=[...new Set(rows.map(r=>r.date))],pages=Math.max(1,Math.ceil(days.length/7)),current=Math.min(page,pages-1);
 const bounds=historyBounds(range);
 const observations=scoped.flatMap(a=>a.observations.map(o=>({...o,account:a}))).filter(o=>{const d=dateKey(new Date(o.date));return d>=bounds.start&&d<=bounds.end;}).sort((a,b)=>b.date.localeCompare(a.date));
 const lastQuota=Math.max(0,Math.ceil(observations.length/10)-1),currentQuota=Math.min(quotaPage,lastQuota);
 const reset=()=>{setPage(0);setExpanded(null);setModelRow(null);setQuotaPage(0);};
 return <div className="history-page">
  {accounts.length>1&&<div className="history-filter"><Select label={tr('Account')} value={scope} onValueChange={v=>{setScope(v);reset();}} options={[{value:'all',label:t.all},...accounts.map(a=>({value:a.id,label:a.email?`${a.name} · ${a.email}`:a.name}))]}/></div>}
  <HistorySummary accounts={scoped} t={t} language={language} range={range} onRange={v=>{setRange(v);reset();}}/>
  <p className="group-description">{t.deviceHistory}</p>
  {days.length>0&&<section className="history-records"><h2>{tr('Daily Records')}</h2>
   {days.slice(current*7,current*7+7).map(date=>{
    const entries=rows.filter(r=>r.date===date),sum=summarizeHistory(entries);
    return <div className="day-record" key={date}>
     <Button variant="ghost" className="row-button day-trigger" aria-expanded={expanded===date} onClick={()=>{setExpanded(expanded===date?null:date);setModelRow(null);}}>
      <span className="record-label">{new Date(`${date}T12:00:00`).toLocaleDateString(language,{month:'short',day:'numeric'})}<small>{number(sum.tokens,language)} token</small></span><span className="record-value">{money(sum.cost,language)}</span>{expanded===date?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
     </Button>
     {expanded===date&&<div className="day-entries">{entries.map(r=><div className="history-entry" key={r.owner}>
      <Button variant="ghost" size="sm" className="row-button entry-trigger" disabled={!r.models.length} aria-expanded={modelRow===r.owner} onClick={()=>setModelRow(modelRow===r.owner?null:r.owner)}>
       <span className="record-label">{r.provider}{r.account&&<small>{r.account}</small>}</span><span className="record-value">{money(r.cost,language)}<small>{number(r.tokens,language)} token</small></span>{r.models.length>0&&(modelRow===r.owner?<ChevronDown size={14}/>:<ChevronRight size={14}/>)}
      </Button>
      {modelRow===r.owner&&r.models.map(m=><div className="model-record" key={m.model}><span>{tr(m.model)}</span><span>{money(m.cost,language)}<small>{number(m.tokens,language)} token</small></span>{m.variants.length>0&&<details><summary>{tr('Model Breakdown')}</summary>{m.variants.map(v=><p key={v.model}>{v.model} · {number(v.tokens,language)} token · {money(v.cost,language)}</p>)}</details>}</div>)}
     </div>)}</div>}
    </div>;
   })}
   {pages>1&&<div className="pagination"><Button size="sm" variant="ghost" disabled={!current} aria-label={tr('Previous Page')} onClick={()=>{setPage(current-1);setExpanded(null);}}><ChevronLeft size={16}/></Button><span>{current+1} / {pages}</span><Button size="sm" variant="ghost" disabled={current===pages-1} aria-label={tr('Next Page')} onClick={()=>{setPage(current+1);setExpanded(null);}}><ChevronRight size={16}/></Button></div>}
  </section>}
  {observations.length>0&&<section className="observations"><Button variant="ghost" size="sm" aria-expanded={showQuota} onClick={()=>setShowQuota(!showQuota)}>{t.quotaHistory}{showQuota?<ChevronDown size={15}/>:<ChevronRight size={15}/>}</Button>{showQuota&&<>
   {observations.slice(currentQuota*10,currentQuota*10+10).map((o,i)=><div className="observation-row" key={`${o.account.id}-${o.date}-${i}`}><span>{o.account.name} · {tr(o.label)}<small>{o.account.email}</small><small>{new Date(o.date).toLocaleString(language,{dateStyle:'short',timeStyle:'short'})}</small></span><span>{o.value==null?'—':`${number(o.value,language)} ${o.unit??''}`}</span></div>)}
   {lastQuota>0&&<div className="pagination"><Button size="sm" variant="ghost" disabled={!currentQuota} aria-label={tr('Previous Page')} onClick={()=>setQuotaPage(currentQuota-1)}><ChevronLeft size={16}/></Button><span>{currentQuota+1} / {lastQuota+1}</span><Button size="sm" variant="ghost" disabled={currentQuota===lastQuota} aria-label={tr('Next Page')} onClick={()=>setQuotaPage(currentQuota+1)}><ChevronRight size={16}/></Button></div>}
  </>}</section>}
 </div>;
}
