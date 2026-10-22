import styles from './gauge.module.css';

// Read-only adaptation of Arc Gauge. See ../NOTICE.md for source and changes.
const radius=42,start=-135,span=270;
function arcFor(sweep:number) {
 const end=start+span*Math.min(1,Math.max(0,sweep));
 const at=(angle:number)=>`${(50+radius*Math.sin(angle*Math.PI/180)).toFixed(3)} ${(50-radius*Math.cos(angle*Math.PI/180)).toFixed(3)}`;
 return `M ${at(start)} A ${radius} ${radius} 0 ${end-start>180?1:0} 1 ${at(end)}`;
}
const track=arcFor(1);

/** A percentage meter, not a completion target. Only the arc is bounded. */
export function Gauge({value,label,valueText,tone='accent'}:{value:number;label:string;valueText:string;tone?:'accent'|'danger'}) {
 const percentage=Math.min(1,Math.max(0,value/100));
 return <div className={styles.visual} data-tone={tone} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage*100} aria-valuetext={valueText}>
  <svg viewBox="0 0 100 90" aria-hidden="true" focusable="false"><path className={styles.track} d={track}/><path className={styles.arc} d={arcFor(percentage)} opacity={Math.min(1,percentage/.02)}/></svg>
  <div className={styles.readout} aria-hidden="true"><span className={styles.number}>{Math.round(value)}<span className={styles.unit}>%</span></span></div>
 </div>;
}
