import {useState} from 'react';
import {ChevronDown} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {homeUsageStyles,type HomeUsageStyle} from '../homeUsage';

/** A small drawing of each Home style, so the choice can be made without trying every option. */
function StyleGlyph({style}:{style:HomeUsageStyle}) {
 const ring=(cx:number,r:number,share:number,width=3)=><><circle cx={cx} cy="12" r={r} fill="none" stroke="currentColor" opacity=".2" strokeWidth={width}/><circle cx={cx} cy="12" r={r} fill="none" stroke="currentColor" strokeWidth={width} pathLength="100" strokeDasharray={`${share} 100`} transform={`rotate(-90 ${cx} 12)`}/></>;
 const glyph:Record<HomeUsageStyle,React.ReactNode>={
  bars:<><rect x="2" y="6" width="36" height="4" rx="2" fill="currentColor" opacity=".2"/><rect x="2" y="6" width="25" height="4" rx="2" fill="currentColor"/><rect x="2" y="14" width="36" height="4" rx="2" fill="currentColor" opacity=".2"/><rect x="2" y="14" width="13" height="4" rx="2" fill="currentColor"/></>,
  gauges:<><path d="M4 19a9 9 0 0 1 18 0" fill="none" stroke="currentColor" opacity=".2" strokeWidth="3" strokeLinecap="round"/><path d="M4 19a9 9 0 0 1 14-7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M25 19a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" opacity=".2" strokeWidth="3" strokeLinecap="round"/><path d="M25 19a6.5 6.5 0 0 1 4-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></>,
  cells:<>{Array.from({length:10},(_,i)=><rect key={i} x={4+(i%5)*7} y={i<5?5:13} width="5" height="5" rx="1" fill="currentColor" opacity={i%5<(i<5?4:2)?1:.2}/>)}</>,
  rings:<>{ring(11,7.5,68)}{ring(29,7.5,31)}</>,
  ruler:<><path d="M2 15h36" stroke="currentColor" opacity=".2" strokeWidth="2"/><path d="M2 15h26" stroke="currentColor" strokeWidth="2"/>{[2,11,20,29,38].map(x=><path key={x} d={`M${x} 18v3`} stroke="currentColor" opacity=".5"/>)}<path d="M28 11l-3-4h6z" fill="currentColor"/></>,
  concentric:<>{ring(20,9.5,68,2.5)}{ring(20,5,31,2.5)}</>,
  numbers:<text x="20" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">68%</text>,
  segments:<>{[0,1,2,3,4].map(i=><rect key={i} x={2+i*7.6} y="9" width="6.4" height="6" rx="1.5" fill="currentColor" opacity={i<3?1:.2}/>)}</>,
 };
 return <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">{glyph[style]}</svg>;
}

/** Collapsed to one row showing the current style; expands into every style at once. */
export function UsageStylePicker({value,onChange,tr,disabled=false}:{disabled?:boolean;value:HomeUsageStyle;onChange:(style:HomeUsageStyle)=>void;tr:(s:string)=>string}) {
 const [open,setOpen]=useState(false);
 return <div className="usage-style-picker">
  <button type="button" className="usage-style-toggle" disabled={disabled} aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
   <span>{tr('Usage Style')}</span><span className="usage-style-current">{tr(homeUsageStyles[value])}</span><ChevronDown size={15} aria-hidden="true" data-open={open}/>
  </button>
  {open&&<div className="usage-style-options" role="group" aria-label={tr('Usage Style')}>
   {(Object.entries(homeUsageStyles) as [HomeUsageStyle,string][]).map(([style,label])=><Button key={style} disabled={disabled} type="button" variant="secondary" className="usage-style-option" aria-pressed={value===style} onClick={()=>onChange(style)}>
    <span className="usage-style-card-content"><StyleGlyph style={style}/><span>{tr(label)}</span></span>
   </Button>)}
  </div>}
 </div>;
}
