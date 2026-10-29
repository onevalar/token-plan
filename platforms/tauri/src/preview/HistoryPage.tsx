import {useMemo,useState} from 'react';
import {ChevronDown,ChevronLeft,ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import SegmentedControl from '../components/arc/segmented-control/segmented-control';
import {providerText} from '../providerText';
import {historyRange,historyBounds,summarizeHistory,dateKey} from '../historyModel';
import {statisticsView,type StatisticsRange,type StatisticsMeasure} from '../statisticsData';
import {MetricRow} from '../Metrics';
import {StatisticsModules} from './StatisticsModules';
import {StatisticsContent} from './StatisticsContent';
import {Coverage} from './StatisticsShared';
import {HistoryModelBreakdown} from './HistoryModelBreakdown';
import type {Account} from '../desktop';
import type {Copy} from '../copy';

export const isHistoryMetric=(id:string)=>/(?:^|\.)(today|yesterday|last30|trend)$/.test(id);
const money=(value:number|null,language:string)=>value==null?'—':new Intl.NumberFormat(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
const number=(value:number,language:string)=>new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(value);
type HistoryProps={accounts:Account[];t:Copy;language:string};

function HistoryRanges({range,onRange,language}:{range:string;onRange:(range:string)=>void;language:string}) {
 const tr=(text:string)=>providerText(text,language);
 return <nav className="segments preview-segments history-ranges" aria-label={tr('Time Range')}>
  {[['1','Today'],['yesterday','Yesterday'],['7','Last 7 Days'],['30','Last 30 Days']].map(([value,label])=><Button size="sm" variant={range===value?'secondary':'ghost'} aria-pressed={range===value} key={value} onClick={()=>onRange(value)}>{tr(label)}</Button>)}
 </nav>;
}
function HistoryFallback({accounts,t,language,range}:HistoryProps&{range:string}) {
 const fallback=accounts.length===1?accounts[0].metrics.find(m=>m.id.split('.').at(-1)===({1:'today',yesterday:'yesterday',30:'last30'}[range])):undefined;
 const trend=accounts.length===1&&range==='30'?accounts[0].metrics.find(m=>m.chart.length>0&&isHistoryMetric(m.id)):undefined;
 return fallback?.hasData||trend?<div className="history-fallback">{fallback?.hasData&&<MetricRow metric={fallback} now={Date.now()} missing={t.noHistory} language={language}/>} {trend&&<MetricRow metric={trend} now={Date.now()} missing={t.noHistory} language={language}/>}</div>:<p className="empty-state">{t.noHistory}</p>;
}
export function HistorySummary({accounts,t,language,range,onRange,showTrend=true}:{showTrend?:boolean;range:string;onRange:(range:string)=>void}&HistoryProps) {
 const tr=(s:string)=>providerText(s,language),rows=historyRange(accounts,'all',range),total=summarizeHistory(rows);
 const bounds=historyBounds(range);
 const days=Array.from({length:range==='yesterday'?1:Number(range)},(_,i)=>{
  const d=new Date(`${bounds.start}T12:00:00`);d.setDate(d.getDate()+i);
  const key=dateKey(d),entries=rows.filter(r=>r.date===key);
  return {key,tokens:entries.length?summarizeHistory(entries).tokens:null};
 });
 const maximum=Math.max(1,...days.map(d=>d.tokens??0));
 return <div className="usage-summary">
  <HistoryRanges range={range} onRange={onRange} language={language}/>
  {rows.length?<>
   <dl className="history-totals"><div><dt>{t.cost}</dt><dd>{money(total.cost,language)}</dd></div><div><dt>{t.tokens}</dt><dd>{number(total.tokens,language)}</dd></div></dl>
   {showTrend&&(range==='30'||range==='7')&&<div className="daily-trend"><div className="trend-bars" role="img" aria-label={tr('Daily Token Usage')}>{days.map(d=><span key={d.key} data-missing={d.tokens==null} style={{height:d.tokens==null?'0':`${(d.tokens/maximum)*100}%`}}/>)}</div><div className="trend-caption"><span>{tr('Daily Token Usage')}</span><span>{bounds.start.slice(5)} — {bounds.end.slice(5)}</span></div></div>}
  </>:<HistoryFallback accounts={accounts} t={t} language={language} range={range}/>}
  {(accounts.some(a=>a.historyPartial)||rows.some(r=>r.cost==null)&&total.cost!=null)&&<p className="notice" role="status">{t.historyWarning}</p>}
 </div>;
}

export function HistoryPage({accounts,t,language,initialRange='30'}:HistoryProps&{initialRange?:string}) {
 const tr=(s:string)=>providerText(s,language);
 const [scope,setScope]=useState('all'),[range,setRange]=useState(initialRange),[page,setPage]=useState(0);
 const [measure,setMeasure]=useState<StatisticsMeasure>('tokens');
 const [expanded,setExpanded]=useState<string|null>(null),[modelRow,setModelRow]=useState<string|null>(null);
 const scoped=useMemo(()=>scope==='all'?accounts:accounts.filter(a=>a.id===scope),[scope,accounts]);
 const today=dateKey(new Date());
 const view=useMemo(()=>statisticsView(scoped,range as StatisticsRange,new Date(`${today}T12:00:00`)),[scoped,range,today]),rows=view.rows;
 const referenceScope=scoped.length===1?scoped[0].id:scope;
 const days=[...new Set(rows.map(r=>r.date))],pages=Math.max(1,Math.ceil(days.length/7)),current=Math.min(page,pages-1);
 const reset=()=>{setPage(0);setExpanded(null);setModelRow(null);};
 return <div className="history-page">
  {accounts.length>1&&<div className="history-filter"><Select label={tr('Account')} value={scope} onValueChange={v=>{setScope(v);reset();}} options={[{value:'all',label:t.all},...accounts.map(a=>({value:a.id,label:a.email?`${a.name} · ${a.email}`:a.name}))]}/></div>}
  <HistoryRanges language={language} range={range} onRange={value=>{setRange(value);reset();}}/>
  <div className="statistics-measure"><SegmentedControl label={tr('Chart Measure')} options={[{value:'tokens',label:t.tokens},{value:'cost',label:t.cost}]} value={measure} onValueChange={value=>setMeasure(value as StatisticsMeasure)}/><span>{view.bounds.start} – {view.bounds.end}</span></div>
  <p className="group-description">{t.deviceHistory}</p>
  {(view.partial||!view.costComplete)&&rows.length>0&&<p className="notice" role="status">{t.historyWarning}</p>}
  <StatisticsModules key={range} language={language} range={range}>{(id,style)=>{
   if(id==='overview'&&!rows.length)return <HistoryFallback accounts={scoped} t={t} language={language} range={range}/>;
   if(id!=='records')return <StatisticsContent key={`${id}:${style}:${scope}:${range}:${measure}`} id={id} style={style} view={view} measure={measure} language={language} accounts={scoped} scope={referenceScope} range={range}/>;
   return days.length>0?<section className="history-records"><h2>{tr('Daily Records')}</h2>
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
      {modelRow===r.owner&&<HistoryModelBreakdown row={r} language={language}/>}
     </div>)}</div>}
    </div>;
   })}
   {pages>1&&<div className="pagination"><Button size="sm" variant="ghost" disabled={!current} aria-label={tr('Previous Page')} onClick={()=>{setPage(current-1);setExpanded(null);}}><ChevronLeft size={16}/></Button><span>{current+1} / {pages}</span><Button size="sm" variant="ghost" disabled={current===pages-1} aria-label={tr('Next Page')} onClick={()=>{setPage(current+1);setExpanded(null);}}><ChevronRight size={16}/></Button></div>}
  </section>:<p>{t.noHistory}</p>;
  }}</StatisticsModules>
  <div className="statistics-design"><Coverage view={view} language={language}/></div>
 </div>;
}
