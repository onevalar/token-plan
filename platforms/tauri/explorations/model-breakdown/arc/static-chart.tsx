// Static, local excerpts adapted from Arc's free bar-chart and donut-chart.
// Copyright (c) 2026 Elia Kuratli. MIT. See LICENSE and ../README.md.
// No hidden segments, hover lift, tooltip, minimum-fill padding or animation.
import {exact} from '../data';

/** Arc bar-chart scaleFor, unchanged: a common zero-based numeric scale. */
export function scaleFor(max:number) {
 const safe=Math.max(max,1);
 const magnitude=10**Math.floor(Math.log10(safe/4));
 for(const factor of [1,2,3,5,10]) {
  const step=factor*magnitude,rows=Math.ceil(safe/step);
  if(rows<=4)return {top:rows*step,ticks:Array.from({length:rows+1},(_,row)=>row*step)};
 }
 return {top:safe,ticks:[0,safe]};
}
export type Part={key:string;label:string;value:number;color:string};
const TAU=Math.PI*2;
// More precision than upstream's 2 decimals so tiny nonzero shares are not enlarged.
const n2=(value:number)=>(Math.round(value*1e6)/1e6).toString();
/** Arc donut-chart sector, simplified only to gap=0/corner=0 for literal area shares.
 * No rounding/hover widening eats small slices or changes the displayed share. */
export function sector(c:number,R:number,r:number,t0:number,t1:number) {
 const turns=t1-t0;
 if(turns<=0)return '';
 const at=(radius:number,angle:number)=>`${n2(c+radius*Math.cos(angle))} ${n2(c+radius*Math.sin(angle))}`;
 if(turns>=1)return `M${at(R,-Math.PI/2)}A${n2(R)} ${n2(R)} 0 1 1 ${at(R,Math.PI/2)}A${n2(R)} ${n2(R)} 0 1 1 ${at(R,-Math.PI/2)}ZM${at(r,-Math.PI/2)}A${n2(r)} ${n2(r)} 0 1 0 ${at(r,Math.PI/2)}A${n2(r)} ${n2(r)} 0 1 0 ${at(r,-Math.PI/2)}Z`;
 const a0=t0*TAU-Math.PI/2,a1=t1*TAU-Math.PI/2,big=a1-a0>Math.PI?1:0;
 return `M${at(R,a0)}A${n2(R)} ${n2(R)} 0 ${big} 1 ${at(R,a1)}L${at(r,a1)}A${n2(r)} ${n2(r)} 0 ${big} 0 ${at(r,a0)}Z`;
}
export function StaticDonut({parts,total}:{parts:Part[];total:number}) {
 let at=0;
 // Arc's cumulative turn layout, but the validated denominator is fixed explicitly.
 const slices=parts.map(part=>{const start=at;at+=part.value/total;return {...part,start,end:at};});
 return <figure className="mb-donut" aria-label="模型已记录 tokens 构成，精确读数见下方列表">
  <svg viewBox="0 0 208 208" aria-hidden="true">{slices.map(p=><path key={p.key} data-part={p.key} data-start={p.start} data-end={p.end} data-value={p.value} d={sector(104,97,73,p.start,p.end)} fill={p.color}/>)}</svg>
  <div className="mb-donut-center"><span>已记录 tokens</span><strong>{exact(total)}</strong><small>固定份额分母</small></div>
 </figure>;
}
