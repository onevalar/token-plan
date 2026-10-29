import {useId,type ReactNode} from 'react';
import {ChevronRight,TriangleAlert} from 'lucide-react';
import type {Metric} from './desktop';
import {MetricRow,MetricReset,MetricExpiries,type MetricRowProps} from './Metrics';
import {preciseQuotaReading,quotaMeter,type HomeQuotaDesign} from './homeUsage';
import {providerText} from './providerText';

export type Reading=ReturnType<typeof preciseQuotaReading>;
export type ReadingProps=Omit<MetricRowProps,'metric'>;
export type Disclosure={selected:string|null;detailId:string;onSelect:(metricId:string,trigger:HTMLButtonElement)=>void};
export type DesignProps=ReadingProps&Disclosure&{metrics:Metric[];variant:HomeQuotaDesign['variant']};
export const clamp=(value:number)=>Math.max(0,Math.min(100,value));
export function metricAttributes(metric:Metric,r:Reading) {
 return {'data-metric':metric.id,'data-kind':'quota','data-value':r.value??'unknown','data-used':r.used??'unknown','data-tone':r.tone};
}
export function MetricLabel({metric,r,selected,detailId,onSelect,language}:Disclosure&{metric:Metric;r:Reading;language:string}) {
 return <button type="button" className="hq-metric-label" data-open-metric={metric.id}
  aria-label={providerText('View %@ Quota Details',language).replace('%@',r.name)} aria-controls={selected===metric.id?detailId:undefined}
  aria-expanded={selected===metric.id} onClick={event=>onSelect(metric.id,event.currentTarget)}>
  <span>{r.name}</span><ChevronRight size={14} aria-hidden="true"/>
 </button>;
}
export function Value({r,small=false}:{r:Reading;small?:boolean}) {
 return <span className={`hq-value${small?' hq-value-small':''}`} data-quota-value={r.value??'unknown'}>{r.value===null?'—':<>{r.valueText.slice(0,-1)}<small>%</small></>}</span>;
}
export function Status({r,missing}:{r:Reading;missing:string}) {
 return r.warning?<span className="hq-warning"><TriangleAlert size={12} aria-hidden="true"/>{r.warning}</span>:r.value===null?<span className="hq-missing">{missing}</span>:null;
}
export function Reset(props:MetricRowProps) {return props.metric.hasData?<span className="hq-reset"><MetricReset {...props}/></span>:null;}
export function Meter({r,children,className=''}:{r:Reading;children:ReactNode;className?:string}) {
 return <div className={`hq-meter ${className}`} {...quotaMeter(r)} data-empty={r.value===null}>{children}</div>;
}
export function Amount(props:MetricRowProps) {
 return <div className="hq-amount" data-kind="amount" data-metric={props.metric.id}><MetricRow {...props}/></div>;
}
export function Expiries(props:Pick<MetricRowProps,'metric'|'language'>) {return <MetricExpiries {...props}/>;}

/** Fixed-denominator geometry used by the approved quota designs, not a share of other metrics. */
export function point(angle:number,r:number,cx=80,cy=80) {
 const a=angle*Math.PI/180;return {x:cx+r*Math.sin(a),y:cy-r*Math.cos(a)};
}
export function arcPath(from:number,to:number,r:number,cx=80,cy=80) {
 const a=point(from,r,cx,cy),b=point(to,r,cx,cy);
 return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to-from>180?1:0} 1 ${b.x} ${b.y}`;
}
export function ScaleTicks({start=-130,span=260,radius=68,count=41,cx=80,cy=80}:{start?:number;span?:number;radius?:number;count?:number;cx?:number;cy?:number}) {
 return <g className="hq-scale-ticks">{Array.from({length:count},(_,i)=>{
  const a=start+span*i/(count-1),major=i%5===0,from=point(a,radius-(major?7:3),cx,cy),to=point(a,radius,cx,cy);
  return <line key={i} x1={from.x} y1={from.y} x2={to.x} y2={to.y} data-major={major}/>;
 })}</g>;
}
export function Track({value}:{value:number|null}) {
 return <div className="hq-track" data-unknown={value===null} aria-hidden="true">
  {value!==null&&<span style={{transform:`scaleX(${clamp(value)/100})`}}/>}
 </div>;
}
/** A fractional last cell preserves small readings rather than rounding them to zero or a whole cell. */
export function Cells({value,count,shape,columns}:{value:number;count:number;shape:'round'|'slash';columns:number}) {
 const id=useId();
 return <div className="hq-cells" data-cell-shape={shape} style={{gridTemplateColumns:`repeat(${columns},minmax(0,1fr))`}} aria-hidden="true" data-cell-group={id}>
  {Array.from({length:count},(_,i)=><i key={i}><span style={{transform:`scaleX(${Math.max(0,Math.min(1,value/(100/count)-i))})`}}/></i>)}
 </div>;
}
