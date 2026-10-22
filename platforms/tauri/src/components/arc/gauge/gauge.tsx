import styles from './gauge.module.css';

// Read-only adaptation of Arc Gauge. See ../NOTICE.md for source and changes.
const start=-135,span=270;
function arcFor(sweep:number,radius=42) {
 const end=start+span*Math.min(1,Math.max(0,sweep));
 const at=(angle:number)=>`${(50+radius*Math.sin(angle*Math.PI/180)).toFixed(3)} ${(50-radius*Math.cos(angle*Math.PI/180)).toFixed(3)}`;
 return `M ${at(start)} A ${radius} ${radius} 0 ${end-start>180?1:0} 1 ${at(end)}`;
}

/** SVG paths shared by the full, compact and independent concentric quota meters. */
export function GaugeArc({value,radius=42,tone='accent'}:{value:number|null;radius?:number;tone?:'accent'|'danger'}) {
 const percentage=value===null?0:Math.min(1,Math.max(0,value/100));
 return <g className={styles.paths} data-tone={tone} data-missing={value===null}>
  <path className={styles.track} d={arcFor(1,radius)}/>
  {percentage>0&&<path className={styles.arc} d={arcFor(percentage,radius)} opacity={Math.min(1,percentage/.02)}/>}
 </g>;
}

/** A percentage meter, not a completion target. Only the arc is bounded. */
export function Gauge({value,label,valueText,tone='accent'}:{value:number;label:string;valueText:string;tone?:'accent'|'danger'}) {
 const percentage=Math.min(1,Math.max(0,value/100));
 return <div className={styles.visual} data-tone={tone} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage*100} aria-valuetext={valueText}>
  <svg viewBox="0 0 100 90" aria-hidden="true" focusable="false"><GaugeArc value={value} tone={tone}/></svg>
  <div className={styles.readout} aria-hidden="true"><span className={styles.number}>{Math.round(value)}<span className={styles.unit}>%</span></span></div>
 </div>;
}
