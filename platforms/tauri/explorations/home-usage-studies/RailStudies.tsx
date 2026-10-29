import {useLayoutEffect,useRef,useState} from 'react';
import {isQuotaMetric} from '../../src/Metrics';
import {Amount,Expiries,Meter,MetricLabel,Reset,Status,Value} from './Shared';
import {clamp,metricAttributes,readQuota,type Reading,type StudyProps} from './data';
import './rail-studies.css';

const divisions=Array.from({length:21},(_,i)=>i*5);

export function RailStudies(props:StudyProps) {
 const {metrics,variant,now,selected,onSelect}=props;
 return <div className="hu-rails" data-rail-study={`D${variant+1}`}>
  {metrics.map(metric=>{
   if(!isQuotaMetric(metric))return <Amount key={metric.id} metric={metric} remaining={props.remaining} now={now} missing={props.missing}/>;
   const r=readQuota(metric,props);
   const label=<MetricLabel metric={metric} r={r} selected={selected} onSelect={onSelect}/>;
   const reset=<Reset metric={metric} now={now}/>;
   return <section className={`hu-rail-row hu-rail-${['horizontal','edge','folded'][variant]}`} key={metric.id} {...metricAttributes(metric,r)}>
    {variant===0?<>
     <div className="hu-rail-inline">
      <div className="hu-rail-caption">{label}{reset}</div>
      <div className="hu-rail-reading"><Value r={r} small/><Status r={r}/></div>
     </div>
     <HorizontalRuler r={r}/>
    </>:variant===1?<>
     <div className="hu-rail-edge-body">
      {label}
      <div className="hu-rail-edge-readout"><Value r={r}/><div className="hu-rail-edge-meta">{reset}<Status r={r}/></div></div>
     </div>
     <EdgeRuler r={r}/>
    </>:<>
     <div className="hu-rail-fold-heading">{label}<Value r={r} small/></div>
     <FoldedRuler r={r}/>
     <div className="hu-rail-fold-meta">{reset}<Status r={r}/></div>
    </>}
    <div className="hu-rail-expiries"><Expiries metric={metric}/></div>
   </section>;
  })}
 </div>;
}

function HorizontalRuler({r}:{r:Reading}) {
 return <Meter r={r} className="hu-rail-horizontal-meter">
  <div className="hu-rail-horizontal-scale" aria-hidden="true">
   <div className="hu-rail-axis">
    {divisions.map(value=><i key={value} className="hu-rail-tick" data-major={value%25===0} style={{left:`${value}%`}}/>)}
    {r.value!==null&&<span className="hu-rail-dot" data-rail-marker style={{left:`${clamp(r.value)}%`}}/>}
   </div>
   <div className="hu-rail-scale-labels"><span>0</span><span>50</span><span>100</span></div>
  </div>
 </Meter>;
}

function EdgeRuler({r}:{r:Reading}) {
 return <Meter r={r} className="hu-rail-edge-meter">
  <div className="hu-rail-edge-scale" aria-hidden="true">
   <span className="hu-rail-edge-end">100</span>
   <div className="hu-rail-edge-axis">
    {divisions.filter(value=>value%10===0).map(value=><i key={value} className="hu-rail-edge-tick" data-major={value%50===0} style={{bottom:`${value}%`}}/>)}
    {r.value!==null&&<span className="hu-rail-edge-dot" data-rail-marker style={{bottom:`${clamp(r.value)}%`}}/>}
   </div>
   <span className="hu-rail-edge-end">0</span>
  </div>
 </Meter>;
}

function FoldedRuler({r}:{r:Reading}) {
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(280);
 // Measure in CSS pixels so the bend keeps its radius and contributes its true length at every panel width.
 useLayoutEffect(()=>{
  const node=ref.current!;
  const measure=()=>setWidth(node.getBoundingClientRect().width);
  measure();
  const observer=new ResizeObserver(measure);observer.observe(node);
  return ()=>observer.disconnect();
 },[]);
 const left=8,top=26,radius=16,bottom=top+radius*2,turnX=width-44;
 const straight=turnX-left,bend=Math.PI*radius,total=straight*2+bend;
 const pointAt=(percent:number)=>{
  const distance=total*percent/100;
  if(distance<=straight)return {x:left+distance,y:top,nx:0,ny:-1};
  if(distance>=straight+bend)return {x:turnX-(distance-straight-bend),y:bottom,nx:0,ny:1};
  const angle=(distance-straight)/radius-Math.PI/2;
  return {x:turnX+radius*Math.cos(angle),y:top+radius+radius*Math.sin(angle),nx:Math.cos(angle),ny:Math.sin(angle)};
 };
 const marker=r.value===null?null:pointAt(clamp(r.value));
 return <Meter r={r} className="hu-rail-fold-meter">
  <div ref={ref} className="hu-rail-fold-scale" aria-hidden="true">
   <svg viewBox={`0 0 ${width} 84`} width={width} height="84" focusable="false">
    <path className="hu-rail-fold-path" d={`M ${left} ${top} H ${turnX} A ${radius} ${radius} 0 0 1 ${turnX} ${bottom} H ${left}`}/>
    {divisions.map(value=>{
     const p=pointAt(value),length=value%25===0?7:4;
     return <line key={value} className="hu-rail-fold-tick" data-major={value%25===0} x1={p.x} y1={p.y} x2={p.x+p.nx*length} y2={p.y+p.ny*length}/>;
    })}
    {marker&&<circle className="hu-rail-fold-dot" data-rail-marker cx={marker.x} cy={marker.y} r="4.5"/>}
   </svg>
   <span className="hu-rail-fold-start">0 →</span>
   <span className="hu-rail-fold-quarter" style={{left:pointAt(25).x}}>25</span>
   <span className="hu-rail-fold-turn">50<span>↵</span></span>
   <span className="hu-rail-fold-quarter hu-rail-fold-lower" style={{left:pointAt(75).x}}>75</span>
   <span className="hu-rail-fold-end">100 ←</span>
  </div>
 </Meter>;
}
