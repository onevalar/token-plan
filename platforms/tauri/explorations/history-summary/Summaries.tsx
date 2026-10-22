import {Coverage,Empty,Period,Range} from './Shared';
import {money,number,type SummaryProps} from './data';

// Static, wrapping adaptation of free Arc Metric Card's article / label / value / context.
// No AnimatedCounter, change chip, synthetic comparison, or null-to-zero conversion.
export function Summaries({view,range,onRange,onExample}:SummaryProps) {
 return <div className="hs-candidate hs-numbers">
  <Range range={range} onRange={onRange}/><Period view={view}/>
  {view.rows.length?<>
   <div className="hs-metric-grid">
    <article className="hs-metric"><h3>已记录 Tokens</h3><strong data-testid="token-total">{number(view.total.tokens)}</strong><p>当前范围的记录合计</p></article>
    <article className="hs-metric"><h3>{view.costRecords<view.rows.length||view.partial?'已知费用':'记录费用'}</h3><strong data-testid="cost-total">{money(view.total.cost)}</strong><p>{view.total.cost===null?'未提供费用数据':'USD · 仅累加已知费用'}</p></article>
   </div>
   <Coverage view={view}/>
  </>:<Empty onExample={onExample}/>}
 </div>;
}
