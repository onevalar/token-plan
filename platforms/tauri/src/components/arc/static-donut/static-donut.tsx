// Static adaptation of Arc's free DonutChart, retrieved 2026-10-22.
// Source: https://uiarc.dev/r/donut-chart.json
// Copyright (c) 2026 Elia Kuratli. MIT; see ../LICENSE.
// Keeps cumulative turns and annular-sector geometry. No grouping, hidden parts,
// gaps, rounded corners, minimum slice, hover lift, tooltips or animation.
export type DonutPart={key:string;value:number;color:string};
const TAU=Math.PI*2;
// More precision than upstream's two decimals; never enlarge small shares.
const coordinate=(value:number)=>(Math.round(value*1e6)/1e6).toString();

function sector(c:number,R:number,r:number,t0:number,t1:number) {
 const turns=t1-t0;
 if(turns<=0)return '';
 const at=(radius:number,angle:number)=>`${coordinate(c+radius*Math.cos(angle))} ${coordinate(c+radius*Math.sin(angle))}`;
 if(turns>=1)return `M${at(R,-Math.PI/2)}A${R} ${R} 0 1 1 ${at(R,Math.PI/2)}A${R} ${R} 0 1 1 ${at(R,-Math.PI/2)}ZM${at(r,-Math.PI/2)}A${r} ${r} 0 1 0 ${at(r,Math.PI/2)}A${r} ${r} 0 1 0 ${at(r,-Math.PI/2)}Z`;
 const a0=t0*TAU-Math.PI/2,a1=t1*TAU-Math.PI/2,big=a1-a0>Math.PI?1:0;
 return `M${at(R,a0)}A${R} ${R} 0 ${big} 1 ${at(R,a1)}L${at(r,a1)}A${r} ${r} 0 ${big} 0 ${at(r,a0)}Z`;
}

/** Caller validates nonnegative parts and a positive fixed total, and supplies
 * the visible, accessible legend. This decorative SVG never renormalizes. */
export function StaticDonut({parts,total}:{parts:DonutPart[];total:number}) {
 let used=0;
 const slices=parts.map(part=>{const start=used/total;used+=part.value;return {...part,start,end:used/total};});
 return <svg viewBox="0 0 208 208" aria-hidden="true" focusable="false">{slices.map(p=><path key={p.key} data-part={p.key} data-start={p.start} data-end={p.end} data-value={p.value} d={sector(104,97,73,p.start,p.end)} fill={p.color}/>)}</svg>;
}
