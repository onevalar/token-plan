import {Button} from '../../src/components/arc/button/button';
import type {HistoryView,SummaryProps} from './data';

export function Range({range,onRange}:Pick<SummaryProps,'range'|'onRange'>) {
 return <nav className="hs-range" aria-label="时间范围">{[['1','今天'],['yesterday','昨天'],['30','最近 30 天']].map(([value,label])=>
  <Button key={value} variant={range===value?'secondary':'ghost'} aria-pressed={range===value} onClick={()=>onRange(value)}>{label}</Button>
 )}</nav>;
}
export function Coverage({view}:{view:HistoryView}) {
 return <div className="hs-coverage">
  <p><strong>{view.covered} / {view.days.length} 天有记录</strong>{view.covered<view.days.length?'，其余日期未知，不按零计算。':'，仅代表已记录的用量。'}</p>
  <p>{view.costRecords===0?'费用全部未知，不等于免费。':`${view.costRecords} / ${view.rows.length} 条记录有费用，${view.costRecords<view.rows.length?'其余费用未知。':'不等同于实际账单。'}`}</p>
  {view.partial&&<p role="status">来源标记为部分历史，已知费用不是全量账单。</p>}
 </div>;
}
export function Period({view}:{view:HistoryView}) {
 return <p className="hs-period"><time>{view.bounds.start}</time> 至 <time>{view.bounds.end}</time><span>本地日期 · 包含首尾</span></p>;
}
export function Empty({onExample}:{onExample:()=>void}) {
 return <div className="hs-empty"><p>这个范围没有历史记录</p><p>没有记录不代表零用量。可切换时间范围或载入完整示例。</p><Button variant="secondary" onClick={onExample}>载入完整示例</Button></div>;
}
