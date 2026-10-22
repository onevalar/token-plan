import {useId,useState} from 'react';
import {Button} from '../../src/components/arc/button/button';
import {Coverage,Empty,Period,Range} from './Shared';
import {compact,money,number,type HistoryView,type SummaryProps} from './data';

// Static nullable-data adaptation of free Arc Bar Chart (see README source URLs).
// Preserve Arc's scaleFor, 58% slot fill, 28px maximum bar and rounded data end.
// Remove animation, average and scrubber: an unknown day is never fed in as value=0.
function scaleFor(max:number) {
 const safe=Math.max(max,1),magnitude=10**Math.floor(Math.log10(safe/4));
 for(const factor of [1,2,3,5,10]) {
  const step=factor*magnitude,rows=Math.ceil(safe/step);
  if(rows<=4)return {top:rows*step,ticks:Array.from({length:rows+1},(_,row)=>row*step)};
 }
 return {top:safe,ticks:[0,safe]};
}
function barPath(x:number,w:number,h:number,base:number) {
 if(w<=0||h<=.01)return `M${x.toFixed(2)} ${base}H${(x+Math.max(w,0)).toFixed(2)}Z`;
 const r=Math.min(4,w/2,h),top=base-h,f=(value:number)=>value.toFixed(2);
 return `M${f(x)} ${base}V${f(top+r)}A${f(r)} ${f(r)} 0 0 1 ${f(x+r)} ${f(top)}H${f(x+w-r)}A${f(r)} ${f(r)} 0 0 1 ${f(x+w)} ${f(top+r)}V${base}Z`;
}
function Plot({view}:{view:HistoryView}) {
 const peak=Math.max(0,...view.days.flatMap(day=>day.tokens===null?[]:[day.tokens]));
 const {top,ticks}=peak===0?{top:1,ticks:[0]}:scaleFor(peak);
 const width=280,plotHeight=136,base=plotHeight-22,height=base-12,slot=width/view.days.length,bar=Math.min(slot*.58,28);
 return <figure className="hs-chart">
  <figcaption>每日 Tokens<span>单日记录合计，不是套餐额度</span></figcaption>
  <div className="hs-plot-row">
   <svg viewBox={`0 0 ${width} ${plotHeight}`} style={{height:plotHeight}} preserveAspectRatio="none" role="img" aria-label={`每日 token 记录。${view.covered} 天有记录，${view.days.length-view.covered} 天未知。零值用圆点标记，未知用问号标记。精确数值可在下方展开。`}>
    {ticks.map(tick=><line key={tick} className="hs-grid" x1="0" x2={width} y1={base-tick/top*height} y2={base-tick/top*height}/>)}
    {view.days.map((day,index)=>{
     const center=(index+.5)*slot;
     if(day.tokens===null)return <text key={day.key} className="hs-gap" x={center} y={plotHeight-6} textAnchor="middle" data-day={day.key} data-missing="true">?</text>;
     if(day.tokens===0)return <circle key={day.key} className="hs-zero" cx={center} cy={base} r="2" data-day={day.key} data-zero="true"/>;
     return <path key={day.key} className="hs-bar" d={barPath(center-bar/2,bar,day.tokens/top*height,base)} data-day={day.key} data-value={day.tokens}/>;
    })}
   </svg>
   <div className="hs-axis" aria-hidden="true">{ticks.map(tick=><span key={tick} style={{top:`${(base-tick/top*height)/plotHeight*100}%`}}>{compact(tick)}</span>)}</div>
  </div>
  <div className="hs-chart-dates"><span>{view.bounds.start.slice(5)}</span><span>{view.bounds.end.slice(5)}</span></div>
  <p className="hs-legend"><span>实柱：有值</span><span>○：真实零</span><span>?：未知日期</span></p>
 </figure>;
}
export function Daily({view,range,onRange,onExample}:SummaryProps) {
 const [expanded,setExpanded]=useState(false),tableId=useId();
 return <div className="hs-candidate hs-daily">
  <Range range={range} onRange={onRange}/><Period view={view}/>
  {view.rows.length?<>
   <div className="hs-inline-totals"><p><span>已记录 Tokens</span><strong data-testid="token-total">{number(view.total.tokens)}</strong></p><p><span>{view.costRecords<view.rows.length||view.partial?'已知费用':'记录费用'}</span><strong data-testid="cost-total">{money(view.total.cost)}</strong><small>USD</small></p></div>
   <Plot view={view}/><Coverage view={view}/>
   <Button variant="ghost" aria-expanded={expanded} aria-controls={tableId} onClick={()=>setExpanded(!expanded)}>{expanded?'收起每日数值':'查看每日数值'}</Button>
   {expanded&&<table id={tableId} className="hs-daily-table"><caption>逐日记录，未知保留为未知</caption><thead><tr><th scope="col">日期</th><th scope="col">Tokens</th><th scope="col">已知费用</th></tr></thead><tbody>{view.days.map(day=><tr key={day.key}><th scope="row">{day.key}</th><td>{day.tokens===null?'未知':number(day.tokens)}</td><td>{money(day.cost)}</td></tr>)}</tbody></table>}
  </>:<Empty onExample={onExample}/>}
 </div>;
}
