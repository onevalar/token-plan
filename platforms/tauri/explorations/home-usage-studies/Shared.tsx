import {useId,type ReactNode} from 'react';
import {ChevronRight,TriangleAlert} from 'lucide-react';
import type {Metric} from '../../src/desktop';
import {MetricRow,MetricExpiries} from '../../src/Metrics';
import {cycleOf,meterProps,type Reading,type StudyProps} from './data';

export function MetricLabel({metric,r,selected,onSelect}:Pick<StudyProps,'selected'|'onSelect'>&{metric:Metric;r:Reading}) {
 return <button type="button" className="hu-metric-label" data-open-metric={metric.id} aria-label={`查看 ${r.name} 额度详情`}
  aria-expanded={selected===metric.id} onClick={()=>onSelect(metric.id)}><span>{r.name}</span><ChevronRight size={14} aria-hidden="true"/></button>;
}
export function Value({r,small=false}:{r:Reading;small?:boolean}) {
 return <span className={`hu-value${small?' hu-value-small':''}`} data-testid="quota-value" data-value={r.value??'unknown'}>{r.value===null?'—':<>{r.valueText.slice(0,-1)}<small>%</small></>}</span>;
}
export function Status({r}:{r:Reading}) {
 return r.warning?<span className="hu-warning"><TriangleAlert size={12} aria-hidden="true"/>{r.warning}</span>:r.value===null?<span className="hu-missing">暂无读数</span>:null;
}
export function Reset({metric,now}:{metric:Metric;now:number}) {
 const c=cycleOf(metric,now);
 return <span className="hu-reset" data-testid="quota-reset">{c.reset}</span>;
}
export function Meter({r,children,className=''}:{r:Reading;children:ReactNode;className?:string}) {
 return <div className={`hu-meter ${className}`} {...meterProps(r)} data-empty={r.value===null}>{children}</div>;
}
export function Amount({metric,...props}:Omit<StudyProps,'metrics'|'variant'|'selected'|'onSelect'>&{metric:Metric}) {
 return <div className="hu-amount" data-kind="amount" data-metric-id={metric.id}>
  <MetricRow metric={metric} {...props} language="zh-Hans"/>
 </div>;
}
export function Expiries({metric}:{metric:Metric}) {return <MetricExpiries metric={metric} language="zh-Hans"/>;}

/** Fixed-denominator primitives adapted from the existing Arc Gauge and Usage Meter. */
export function point(angle:number,r:number,cx=80,cy=80) {
 const a=angle*Math.PI/180;return {x:cx+r*Math.sin(a),y:cy-r*Math.cos(a)};
}
export function arcPath(from:number,to:number,r:number,cx=80,cy=80) {
 const a=point(from,r,cx,cy),b=point(to,r,cx,cy);
 return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to-from>180?1:0} 1 ${b.x} ${b.y}`;
}
export function ScaleTicks({start=-130,span=260,radius=68,count=41,cx=80,cy=80}:{start?:number;span?:number;radius?:number;count?:number;cx?:number;cy?:number}) {
 return <g className="hu-scale-ticks">{Array.from({length:count},(_,i)=>{
  const a=start+span*i/(count-1),major=i%5===0,from=point(a,radius-(major?7:3),cx,cy),to=point(a,radius,cx,cy);
  return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} data-major={major}/>;
 })}</g>;
}
export function Track({value,vertical=false,className=''}:{value:number|null;vertical?:boolean;className?:string}) {
 return <div className={`hu-track ${className}`} data-vertical={vertical} data-unknown={value===null} aria-hidden="true">
  {value!==null&&<span style={{transform:`${vertical?'scaleY':'scaleX'}(${Math.max(0,Math.min(1,value/100))})`}}/>}
 </div>;
}
/** Fractional cells preserve the exact last piece instead of rounding to a full cell. */
export function Cells({value,count=20,shape='square',columns=10}:{value:number|null;count?:number;shape?:'square'|'round'|'slash';columns?:number}) {
 const id=useId();
 return <div className="hu-cells" data-cell-shape={shape} data-unknown={value===null} style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}} aria-hidden="true" data-cell-group={id}>
  {Array.from({length:count},(_,i)=><i key={i}><span style={{transform:`scaleX(${value===null?0:Math.max(0,Math.min(1,value/(100/count)-i))})`}}/></i>)}
 </div>;
}
