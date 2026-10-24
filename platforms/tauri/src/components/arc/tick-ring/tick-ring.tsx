/*
 * Adapted from Arc Pro Activity Rings, activity-rings.tsx, via Arc MCP on 2026-10-24.
 * Source: https://uiarc.dev/components/activity-rings
 * Copyright (c) 2026 Elia Kuratli. Licensed under https://uiarc.dev/license (Arc Pro).
 * This file contains Arc Pro source and is NOT covered by TokenPlan's MIT license.
 * App integration only; not for standalone redistribution as a component or template.
 */
import {useId} from 'react';
import styles from './tick-ring.module.css';

const SIZE=220,C=SIZE/2,BAND=13,OUTER=106,INNER=OUTER-BAND,MID=OUTER-BAND/2;
const TICKS=Math.round((2*Math.PI*MID)/11/4)*4;

/** Static, decorative quota dial. The caller supplies the accessible meter and unbounded readout. */
export function TickRing({value,valueText,mode,tone='accent'}:{value:number;valueText:string;mode:string;tone?:'accent'|'danger'}) {
 const maskId=`tick-ring-${useId().replace(/[^a-zA-Z0-9_-]/g,'')}`;
 const fraction=Math.max(0,Math.min(1,value/100));
 const lines=Array.from({length:TICKS},(_,i)=>{
  const a=(i/TICKS)*Math.PI*2;
  // Keep Arc's rounded radial coordinates so server and client geometry agree.
  const at=(r:number,f:(n:number)=>number)=>Math.round((C+f(a)*r)*1000)/1000;
  return <line key={i} x1={at(INNER+1,Math.cos)} y1={at(INNER+1,Math.sin)} x2={at(OUTER-1,Math.cos)} y2={at(OUTER-1,Math.sin)}/>;
 });
 return <div className={styles.visual} data-tone={tone} aria-hidden="true">
  <svg viewBox={`0 0 ${SIZE} ${SIZE}`} focusable="false">
   <defs><mask id={maskId}>
    <g transform={`rotate(-90 ${C} ${C})`}><circle cx={C} cy={C} r={MID} fill="none" stroke="white" strokeWidth={BAND+4} pathLength={1} strokeDasharray={`${fraction} 1`}/></g>
   </mask></defs>
   <g className={styles.ticksBase}>{lines}</g>
   <g className={styles.ticksFill} mask={`url(#${maskId})`}>{lines}</g>
  </svg>
  <div className={styles.center}><strong className={styles.number}>{valueText}</strong><span className={styles.mode}>{mode}</span></div>
 </div>;
}
