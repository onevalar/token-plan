import {summarizeHistory} from '../../src/historyModel';
import {DayTimeline} from './arc/DayTimeline';
import {IndependentEntries} from './Entries';
import {dateLabel,weekday,money,number,costLabel,type Row} from './data';

export function Timeline({days,rows}:{days:string[];rows:Row[]}) {
 return <section className="dr-new dr-timeline"><h2>每日记录</h2><DayTimeline items={days.map(date=>{
  const entries=rows.filter(r=>r.date===date),sum=summarizeHistory(entries);
  return {id:date,date:<><time dateTime={date}>{dateLabel(date)}</time><small>{weekday(date)}</small></>,
   summary:<><span>{number(sum.tokens)} token</span><span>{money(sum.cost)}</span></>,
   meta:`${entries.length} 条来源记录 · ${costLabel(entries)}`,detail:<IndependentEntries rows={entries}/>};
 })}/></section>;
}
