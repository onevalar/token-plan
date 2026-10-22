import {summarizeHistory} from '../../src/historyModel';
import {DayCard} from './arc/DayCard';
import {IndependentEntries} from './Entries';
import {dateLabel,weekday,money,number,costLabel,type Row} from './data';

export function Cards({days,rows}:{days:string[];rows:Row[]}) {
 return <section className="dr-new dr-cards"><h2>每日记录</h2><div className="dr-card-list">{days.map(date=>{
  const entries=rows.filter(r=>r.date===date),sum=summarizeHistory(entries);
  return <DayCard key={date} date={date} title={<><time dateTime={date}>{dateLabel(date)}</time><small>{weekday(date)}</small></>} summary={expanded=><>
   <span className="dr-card-values"><span><strong>{number(sum.tokens)}</strong><small>Token</small></span><span><strong>{money(sum.cost)}</strong><small>{costLabel(entries)}</small></span></span>
   <span className="dr-card-meta">{entries.length} 条来源记录<span>{expanded?'收起来源与模型':'查看来源与模型'}</span></span>
  </>}><IndependentEntries rows={entries}/></DayCard>;
 })}</div></section>;
}
