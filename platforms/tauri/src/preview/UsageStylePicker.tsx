import {useState} from 'react';
import {HomeMetrics} from '../HomeMetrics';
import {metricSchema} from '../desktop';
import {SelectRow} from './shared';
import {ChevronDown} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {categoryOf,styleCategories,variantLabel,sameLook,styleOptions,type HomeUsageFamily,styleLabel,type HomeUsageStyle} from '../homeUsage';

/** A small drawing of each Home style, so the choice can be made without trying every option. */
function StyleGlyph({style}:{style:HomeUsageFamily}) {
 const ring=(cx:number,r:number,share:number,width=3)=><><circle cx={cx} cy="12" r={r} fill="none" stroke="currentColor" opacity=".2" strokeWidth={width}/><circle cx={cx} cy="12" r={r} fill="none" stroke="currentColor" strokeWidth={width} pathLength="100" strokeDasharray={`${share} 100`} transform={`rotate(-90 ${cx} 12)`}/></>;
 const glyph:Record<HomeUsageFamily,React.ReactNode>={
  bars:<><rect x="2" y="6" width="36" height="4" rx="2" fill="currentColor" opacity=".2"/><rect x="2" y="6" width="25" height="4" rx="2" fill="currentColor"/><rect x="2" y="14" width="36" height="4" rx="2" fill="currentColor" opacity=".2"/><rect x="2" y="14" width="13" height="4" rx="2" fill="currentColor"/></>,
  gauges:<><path d="M4 19a9 9 0 0 1 18 0" fill="none" stroke="currentColor" opacity=".2" strokeWidth="3" strokeLinecap="round"/><path d="M4 19a9 9 0 0 1 14-7.5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/><path d="M25 19a6.5 6.5 0 0 1 13 0" fill="none" stroke="currentColor" opacity=".2" strokeWidth="3" strokeLinecap="round"/><path d="M25 19a6.5 6.5 0 0 1 4-6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></>,
  cells:<>{Array.from({length:10},(_,i)=><rect key={i} x={4+(i%5)*7} y={i<5?5:13} width="5" height="5" rx="1" fill="currentColor" opacity={i%5<(i<5?4:2)?1:.2}/>)}</>,
  rings:<>{ring(20,9.5,68,2.5)}{ring(20,5,31,2.5)}</>,
  ruler:<><path d="M2 15h36" stroke="currentColor" opacity=".2" strokeWidth="2"/><path d="M2 15h26" stroke="currentColor" strokeWidth="2"/>{[2,11,20,29,38].map(x=><path key={x} d={`M${x} 18v3`} stroke="currentColor" opacity=".5"/>)}<path d="M28 11l-3-4h6z" fill="currentColor"/></>,
  numbers:<text x="20" y="17" textAnchor="middle" fontSize="13" fontWeight="700" fill="currentColor">68%</text>,
  vessel:<><rect x="5" y="7" width="27" height="11" rx="3" fill="none" stroke="currentColor" strokeWidth="1.8"/><rect x="33" y="10.5" width="3" height="4" rx="1" fill="currentColor"/><rect x="7.5" y="9.5" width="16" height="6" rx="1.5" fill="currentColor"/></>,
  frame:<><rect x="5" y="4" width="30" height="16" rx="5" fill="none" stroke="currentColor" opacity=".2" strokeWidth="2.5"/><rect x="5" y="4" width="30" height="16" rx="5" fill="none" stroke="currentColor" strokeWidth="2.5" pathLength="100" strokeDasharray="68 100"/></>,
  sources:<>{[0,1,2].map(i=><rect key={i} x={2+[0,16,25][i]} y="9" width={[15,8,6][i]} height="6" fill="currentColor" opacity={[1,.6,.35][i]}/>)}<rect x="33" y="9" width="5" height="6" fill="currentColor" opacity=".12"/></>,
  columns:<>{[14,8,18].map((h,i)=><g key={i}><rect x={6+i*11} y="3" width="7" height="18" rx="2" fill="currentColor" opacity=".2"/><rect x={6+i*11} y={21-h} width="7" height={h} rx="2" fill="currentColor"/></g>)}</>,
  signal:<>{[0,1,2].map(i=><circle key={i} cx={10+i*10} cy="12" r="4" fill="currentColor" opacity={i===0?1:.2}/>)}</>,
  rowfill:<><rect x="2" y="5" width="36" height="14" rx="4" fill="currentColor" opacity=".2"/><rect x="2" y="5" width="25" height="14" rx="4" fill="currentColor"/></>,
 };
 return <svg width="40" height="24" viewBox="0 0 40 24" aria-hidden="true">{glyph[style]}</svg>;
}

/** Collapsed to one row showing the current style; expands into every style at once. */
export function UsageStylePicker({value,onChange,tr,language,remaining=false,disabled=false}:{language:string;remaining?:boolean;disabled?:boolean;value:HomeUsageStyle;onChange:(style:HomeUsageStyle)=>void;tr:(s:string)=>string}) {
 const [open,setOpen]=useState(false),current=categoryOf(value),groups=styleOptions(value).filter(g=>['Forecast','Shape','Cell Count'].includes(g.name)&&current.id!=='vessel');
 return <div className="usage-style-picker">
  <button type="button" className="usage-style-toggle" disabled={disabled} aria-expanded={open} onClick={()=>setOpen(o=>!o)}>
   <span>{tr('Usage Style')}</span><span className="usage-style-trigger"><span className="usage-style-current">{tr(variantLabel(value))}</span><ChevronDown size={15} aria-hidden="true" data-open={open}/></span>
  </button>
  {open&&<><div className="usage-style-options" role="group" aria-label={tr('Usage Style')}>
   {styleCategories.map(category=><Button key={category.id} disabled={disabled} type="button" variant="secondary" className="usage-style-option" aria-pressed={current.id===category.id} onClick={()=>current.id!==category.id&&onChange(category.styles[0])}>
    <span className="usage-style-card-content"><StyleGlyph style={category.id}/><span>{tr(category.label)}</span></span>
   </Button>)}
  </div>
  {current.styles.length>1&&<SelectRow label={tr('Variant')} disabled={disabled} value={current.styles.find(id=>sameLook(id,value))??current.styles.find(id=>id.split(':')[0]===value.split(':')[0])??current.styles[0]} options={current.styles.map(id=>({value:id,label:tr(variantLabel(id))}))} onValueChange={onChange}/>}
  {groups.map(group=><SelectRow key={group.name} label={tr(group.name)} disabled={disabled} value={group.choices.find(c=>sameLook(c.id,value))?.id??group.choices[0].id} options={group.choices.map(c=>({value:c.id,label:tr(c.label)}))} onValueChange={onChange}/>)}</>}
  <StylePreview value={value} language={language} remaining={remaining} tr={tr}/>
 </div>;
}

function StylePreview({value,language,remaining,tr}:{value:string;language:string;remaining:boolean;tr:(s:string)=>string}) {
 const [now]=useState(()=>Date.now());
 const metrics=[['5h',46,18000],['1w',92,604800]].map(([label,used,period])=>metricSchema.parse({id:`preview-${label}`,label,placement:'home',pinned:false,pinnable:true,hasData:true,unit:'percent',percent:remaining?100-Number(used):used,amount:null,resetsAt:new Date(now+Number(period)*.4*1000).toISOString(),periodSeconds:period,values:[]}));
 return <section className="usage-live-preview" aria-label={tr('Style Preview')}><div className="usage-preview-label">{tr('Style Preview')} · {tr('Sample Data')}</div><HomeMetrics metrics={metrics} style={value} language={language} remaining={remaining} now={now} missing="—" sources={[{name:'Model A',share:.7},{name:'Model B',share:.3}]}/></section>;
}
