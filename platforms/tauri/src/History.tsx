import {useState} from 'react';
import {ChevronDown,ChevronRight,ChevronLeft} from 'lucide-react';
import {Button} from './components/arc/button/button';
import {Select} from './components/arc/select/select';
import type {Account} from './desktop';
import type {Copy} from './copy';
import {providerText} from './providerText';
import {historyRange,historyBounds,summarizeHistory,historyColor,dateKey} from './historyModel';
import {accountTitle} from './usage';

export function History({accounts,t,language,synced=false,compact=false,onOpen}:{accounts:Account[];t:Copy;language:string;synced?:boolean;compact?:boolean;onOpen?:()=>void}) {
 const [family,setFamily]=useState('all'),[range,setRange]=useState('30');
 const [page,setPage]=useState(0),[expanded,setExpanded]=useState<string|null>(null),[modelRow,setModelRow]=useState<string|null>(null);
 const [showQuota,setShowQuota]=useState(false),[quotaPage,setQuotaPage]=useState(0);
 const tr=(s:string)=>providerText(s,language);
 const number=(v:number)=>new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(v);
 const compactMoney=(v:number)=>`$${new Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(v)}`;
 const money=(v:number|null)=>v==null?'—':`$${v.toLocaleString(language,{maximumFractionDigits:2,minimumFractionDigits:2})}`;
 const rows=historyRange(accounts,family,range),total=summarizeHistory(rows);
 const providers=[...new Set(rows.map(r=>r.provider))].map(name=>({name,...summarizeHistory(rows.filter(r=>r.provider===name))}));
 const costSum=providers.reduce((sum,p)=>sum+(p.cost??0),0);
 let cursor=0;
 const gradient=providers.filter(p=>(p.cost??0)>0).map(p=>{const from=cursor;cursor+=(p.cost??0)/costSum*100;return `${historyColor(p.name)} ${from}% ${cursor}%`;}).join(',');
 const days=[...new Set(rows.map(r=>r.date))],pages=Math.max(1,Math.ceil(days.length/7)),current=Math.min(page,pages-1);
 const dates=days.slice(current*7,current*7+7);
 const families=[...new Map(accounts.map(a=>[a.family,a.name])).entries()];
 const changeRange=(value:string)=>{setRange(value);setPage(0);setExpanded(null);setQuotaPage(0);};
 const bounds=historyBounds(range);
 const observations=accounts.filter(a=>family==='all'||a.family===family).flatMap(a=>a.observations.map(o=>({...o,account:a}))).filter(o=>{const date=o.date.length===10?o.date:dateKey(new Date(o.date));return date>=bounds.start&&date<=bounds.end;}).sort((a,b)=>b.date.localeCompare(a.date));
 const currentQuota=Math.min(quotaPage,Math.max(0,Math.ceil(observations.length/10)-1));
 return <section className={`history ${compact?'history-compact':''}`}>
  <div className="section-heading"><h2>{t.history}</h2>{compact&&<Button size="sm" variant="ghost" onClick={onOpen}>{tr('View History')}<ChevronRight size={16}/></Button>}</div>
  <nav className="segments" aria-label={t.history}>{[['1','Today'],['yesterday','Yesterday'],['30','Last 30 Days']].map(([value,label])=><Button size="sm" key={value} variant={range===value?'secondary':'ghost'} aria-pressed={range===value} onClick={()=>changeRange(value)}>{tr(label)}</Button>)}</nav>
  <div className="history-summary">
   <div className="history-donut" style={{background:gradient?`conic-gradient(${gradient})`:'var(--surface-muted)'}} aria-label={`${t.cost}: ${money(total.cost)}`}><div><strong>{total.cost==null?'—':compactMoney(total.cost)}</strong><small>{t.cost}</small></div></div>
   <div className="history-legend">{providers.map(p=><div key={p.name}><span><i style={{background:historyColor(p.name)}}/>{p.name}</span><strong>{money(p.cost)}</strong></div>)}{!providers.length&&<p className="muted">{t.noHistory}</p>}</div>
  </div>
  {!compact&&<>
   <p className="notice">{synced?tr('Shares usage history through iCloud, so you can see one combined summary for all your Macs.'):t.deviceHistory}</p>
   <div className="history-controls"><Select label={tr('Filter by Service')} value={family} onValueChange={v=>{setFamily(v);setPage(0);setQuotaPage(0);setExpanded(null);setModelRow(null);}} options={[{value:'all',label:t.all},...families.map(([value,label])=>({value,label}))]}/><span className="muted">{number(total.tokens)} {t.tokens}</span></div>
   {accounts.some(a=>a.historyPartial)&&<p role="status" className="notice">{t.historyWarning}</p>}
   <div className="history-days">{dates.map(date=>{
    const entries=rows.filter(r=>r.date===date),sum=summarizeHistory(entries);
    return <div className="history-day" key={date}>
     <Button className="history-day-trigger" variant="ghost" aria-expanded={expanded===date} onClick={()=>setExpanded(expanded===date?null:date)}>
      <span>{date}</span><span className="day-total"><small>{number(sum.tokens)} {t.tokens}</small><strong>{money(sum.cost)}</strong>{expanded===date?<ChevronDown size={16}/>:<ChevronRight size={16}/>}</span>
     </Button>
     {expanded===date&&<div className="history-entries">{entries.map(r=><div className="history-entry" key={r.owner}>
      <Button className="history-entry-trigger" size="sm" variant="ghost" aria-expanded={modelRow===r.owner} onClick={()=>setModelRow(modelRow===r.owner?null:r.owner)}>
       <span><strong>{r.provider}</strong>{r.account&&<small>{accountTitle(r.account)}</small>}</span><span><strong>{money(r.cost)}</strong><small>{number(r.tokens)} {t.tokens}</small></span>
      </Button>
      {modelRow===r.owner&&r.models.map(m=><div className="model-history-row" key={m.model}><span>{tr(m.model)}</span><span>{number(m.tokens)} {t.tokens} · {money(m.cost)}</span>{m.variants.length>0&&<details><summary>{tr('Model Breakdown')}</summary>{m.variants.map(v=><p key={v.model}>{v.model} · {number(v.tokens)} {t.tokens} · {money(v.cost)}</p>)}</details>}</div>)}
     </div>)}</div>}
    </div>;
   })}</div>
   {days.length>7&&<div className="pagination"><Button size="sm" variant="ghost" disabled={!current} aria-label={tr('Previous Page')} onClick={()=>{setPage(current-1);setExpanded(null);}}><ChevronLeft size={16}/></Button><span>{current+1} / {pages}</span><Button size="sm" variant="ghost" disabled={current===pages-1} aria-label={tr('Next Page')} onClick={()=>{setPage(current+1);setExpanded(null);}}><ChevronRight size={16}/></Button></div>}
   {observations.length>0&&<><Button size="sm" variant="ghost" aria-expanded={showQuota} onClick={()=>setShowQuota(!showQuota)}>{t.quotaHistory}</Button>{showQuota&&<div className="quota-observations">{observations.slice(currentQuota*10,currentQuota*10+10).map((o,i)=><div key={`${o.account.id}-${o.date}-${i}`}><span>{o.account.name} · {tr(o.label)}<small>{new Date(o.date).toLocaleString(language)}</small></span><strong>{o.value==null?'—':`${number(o.value)} ${o.unit??''}`}</strong></div>)}<div className="pagination"><Button size="sm" variant="ghost" disabled={!currentQuota} onClick={()=>setQuotaPage(currentQuota-1)}>{tr('Previous Page')}</Button><Button size="sm" variant="ghost" disabled={(currentQuota+1)*10>=observations.length} onClick={()=>setQuotaPage(currentQuota+1)}>{tr('Next Page')}</Button></div></div>}</>}
  </>}
 </section>;
}
