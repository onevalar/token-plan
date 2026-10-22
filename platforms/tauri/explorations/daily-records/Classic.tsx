import {useState} from 'react';
import {ChevronDown,ChevronRight} from 'lucide-react';
import {Button} from '../../src/components/arc/button/button';
import {summarizeHistory} from '../../src/historyModel';
import {dateLabel,money,number,type Row} from './data';
import {Entries} from './Entries';

// Focused copy of HistoryPage's daily-record block, not a hidden production page.
export function Classic({days,rows}:{days:string[];rows:Row[]}) {
 const [expanded,setExpanded]=useState<string|null>(null),[modelRow,setModelRow]=useState<string|null>(null);
 return <section className="history-records dr-classic"><h2>每日记录</h2>{days.map(date=>{
  const entries=rows.filter(r=>r.date===date),sum=summarizeHistory(entries);
  return <div className="day-record" key={date} data-day={date}>
   <Button variant="ghost" className="row-button day-trigger" aria-expanded={expanded===date} onClick={()=>{setExpanded(expanded===date?null:date);setModelRow(null);}}>
    <span className="record-label">{dateLabel(date)}<small>{number(sum.tokens)} token</small></span><span className="record-value">{money(sum.cost)}</span>{expanded===date?<ChevronDown size={16}/>:<ChevronRight size={16}/>}
   </Button>
   {expanded===date&&<Entries rows={entries} modelRow={modelRow} setModelRow={setModelRow}/>}
  </div>;
 })}</section>;
}
