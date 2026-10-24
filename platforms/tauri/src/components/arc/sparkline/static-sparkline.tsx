/**
 * Static adaptation of Arc Sparkline's geometryOf point/line mapping.
 * https://uiarc.dev/r/sparkline.json — Copyright (c) 2026 Elia Kuratli, MIT (../LICENSE).
 * Calendar slots and a zero baseline replace per-series min/max interpolation.
 * Nulls break the line; no synthetic samples, smoothing, animation or scrubber.
 * The native counterpart lives in src-tauri/src/tray_sparkline.rs.
 */
export function StaticSparkline({values}:{values:(number|null)[]}) {
 const max=Math.max(1,...values.filter((n):n is number=>n!=null));
 const points=values.map((value,index)=>value==null?null:{x:4+index/Math.max(1,values.length-1)*64,y:36-value/max*32});
 const path=points.map((point,i)=>point?`${i>0&&points[i-1]?'L':'M'}${point.x.toFixed(2)},${point.y.toFixed(2)}`:'').join(' ');
 return <svg className="tray-sparkline" viewBox="0 0 72 40" width="50.4" height="28" aria-hidden="true">
  <path d={path} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  {points.map((point,i)=>point&&<circle key={i} cx={point.x} cy={point.y} r={i===points.length-1||!points[i-1]&&!points[i+1]?2:1.25} fill="currentColor"/>)}
 </svg>;
}
