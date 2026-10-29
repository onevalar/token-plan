import {useLayoutEffect,useRef,useState} from 'react';
import {isQuotaMetric} from './Metrics';
import {preciseQuotaReading} from './homeUsage';
import {Amount,Expiries,Meter,MetricLabel,Reset,Status,Value,clamp,metricAttributes,type Reading,type DesignProps} from './HomeQuotaParts';
import './home-rail-styles.css';

const divisions=Array.from({length:21},(_,i)=>i*5);

export function HomeRailStyles(props:DesignProps) {
 const {metrics,variant}=props;
 return <div className="hq-rails" data-variant={variant}>{metrics.map(metric=>{
  if(!isQuotaMetric(metric))return <Amount key={metric.id} metric={metric} {...props}/>;
  const r=preciseQuotaReading({metric,...props}),label=<MetricLabel metric={metric} r={r} {...props}/>,reset=<Reset metric={metric} {...props}/>;
  return <section className={`hq-rail-row hq-rail-${['horizontal','edge','folded'][variant]}`} key={metric.id} {...metricAttributes(metric,r)}>
   {variant===0?<>
    <div className="hq-rail-inline"><div className="hq-rail-caption">{label}{reset}</div><div className="hq-rail-reading"><Value r={r} small/><Status r={r} missing={props.missing}/></div></div><HorizontalRuler r={r}/>
   </>:variant===1?<>
    <div className="hq-rail-edge-body">{label}<div className="hq-rail-edge-readout"><Value r={r}/><div className="hq-rail-edge-meta">{reset}<Status r={r} missing={props.missing}/></div></div></div><EdgeRuler r={r}/>
   </>:<>
    <div className="hq-rail-fold-heading">{label}<Value r={r} small/></div><FoldedRuler r={r}/><div className="hq-rail-fold-meta">{reset}<Status r={r} missing={props.missing}/></div>
   </>}
   <div className="hq-rail-expiries"><Expiries metric={metric} {...props}/></div>
  </section>;
 })}</div>;
}

function HorizontalRuler({r}:{r:Reading}) {
 return <Meter r={r} className="hq-rail-horizontal-meter"><div className="hq-rail-horizontal-scale" aria-hidden="true">
  <div className="hq-rail-axis">
   {divisions.map(value=><i key={value} className="hq-rail-tick" data-major={value%25===0} style={{left:`${value}%`}}/>)}
   {r.value!==null&&<span className="hq-rail-dot" data-rail-marker style={{left:`${clamp(r.value)}%`}}/>}
  </div><div className="hq-rail-scale-labels"><span>0</span><span>50</span><span>100</span></div>
 </div></Meter>;
}

function EdgeRuler({r}:{r:Reading}) {
 return <Meter r={r} className="hq-rail-edge-meter"><div className="hq-rail-edge-scale" aria-hidden="true">
  <span className="hq-rail-edge-end">100</span><div className="hq-rail-edge-axis">
   {divisions.filter(value=>value%10===0).map(value=><i key={value} className="hq-rail-edge-tick" data-major={value%50===0} style={{bottom:`${value}%`}}/>)}
   {r.value!==null&&<span className="hq-rail-edge-dot" data-rail-marker style={{bottom:`${clamp(r.value)}%`}}/>}
  </div><span className="hq-rail-edge-end">0</span>
 </div></Meter>;
}

function FoldedRuler({r}:{r:Reading}) {
 const ref=useRef<HTMLDivElement>(null),[width,setWidth]=useState(280);
 // The bend contributes its true length in CSS pixels at every panel width. Halfway is the turn, not a new quota.
 useLayoutEffect(()=>{
  const node=ref.current!,measure=()=>{const measured=node.getBoundingClientRect().width;if(measured>0)setWidth(measured);};
  measure();const observer=new ResizeObserver(measure);observer.observe(node);
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
 return <Meter r={r} className="hq-rail-fold-meter"><div ref={ref} className="hq-rail-fold-scale" aria-hidden="true">
  <svg viewBox={`0 0 ${width} 84`} width={width} height="84" focusable="false">
   <path className="hq-rail-fold-path" d={`M ${left} ${top} H ${turnX} A ${radius} ${radius} 0 0 1 ${turnX} ${bottom} H ${left}`}/>
   {divisions.map(value=>{const p=pointAt(value),length=value%25===0?7:4;
    return <line key={value} className="hq-rail-fold-tick" data-major={value%25===0} x1={p.x} y1={p.y} x2={p.x+p.nx*length} y2={p.y+p.ny*length}/>;
   })}
   {marker&&<circle className="hq-rail-fold-dot" data-rail-marker cx={marker.x} cy={marker.y} r="4.5"/>}
  </svg>
  <span className="hq-rail-fold-start">0 →</span><span className="hq-rail-fold-quarter" style={{left:pointAt(25).x}}>25</span>
  <span className="hq-rail-fold-turn">50<span>↵</span></span><span className="hq-rail-fold-quarter hq-rail-fold-lower" style={{left:pointAt(75).x}}>75</span><span className="hq-rail-fold-end">100 ←</span>
 </div></Meter>;
}
