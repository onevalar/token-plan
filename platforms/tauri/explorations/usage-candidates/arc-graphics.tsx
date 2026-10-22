// Experimental read-only adaptations of free Arc Gauge and Usage Meter.
// Source, license and deliberate differences are recorded in README.md.
const start=-135,span=270;
function arcFor(sweep:number,radius:number) {
 const end=start+span*Math.min(1,Math.max(0,sweep));
 const at=(angle:number)=>`${(50+radius*Math.sin(angle*Math.PI/180)).toFixed(3)} ${(50-radius*Math.cos(angle*Math.PI/180)).toFixed(3)}`;
 return `M ${at(start)} A ${radius} ${radius} 0 ${end-start>180?1:0} 1 ${at(end)}`;
}
export function ArcPath({value,radius=42,tone}:{value:number|null;radius?:number;tone:string}) {
 const fraction=value===null?0:Math.max(0,Math.min(1,value/100));
 return <g data-tone={tone} data-missing={value===null}>
  <path className="candidate-track" d={arcFor(1,radius)}/>
  {fraction>0&&<path className="candidate-arc" d={arcFor(fraction,radius)} opacity={Math.min(1,fraction/.02)}/>}
 </g>;
}
export function SmallArc({value,tone}:{value:number|null;tone:string}) {
 return <svg className="small-arc" viewBox="0 0 100 90" aria-hidden="true" focusable="false"><ArcPath value={value} tone={tone}/></svg>;
}
export function QuotaRuler({value,remaining}:{value:number;remaining:boolean}) {
 const fraction=Math.min(1,Math.max(0,value/100)),threshold=remaining?20:80;
 return <div className="ruler-graphic" aria-hidden="true">
  <div className="ruler-bar"><div className="ruler-track"><span className="ruler-segment" style={{transform:`scaleX(${fraction})`}}/></div>
   <span className="ruler-limit" style={{left:remaining?'0%':'100%'}}/>
   <span className="ruler-threshold" style={{left:`${threshold}%`}}/>
  </div>
  <div className="ruler-ticks">{[0,20,40,60,80,100].map(tick=><span key={tick} style={{left:`${tick}%`}} data-warning={tick===threshold}>{tick===threshold?`${tick}⚑`:tick}</span>)}</div>
 </div>;
}
