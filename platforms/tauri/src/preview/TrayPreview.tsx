import type {CSSProperties} from 'react';
import {Button} from '../components/arc/button/button';
import {ProviderLogo} from '../Dashboard';
import logoSizes from '../tray-logo-sizes.json';
import type {Metric} from '../desktop';

type TrayMetric=Pick<Metric,'hasData'|'percent'|'amount'|'unit'>;
export function TrayGlyph({family,metrics,badge,style='ring',position='inside'}:{family:string;metrics:TrayMetric[];badge?:number|null;style?:string;position?:string}) {
 const selected=metrics.slice(0,3),ring=style==='ring'&&selected.length>0&&selected.every(m=>m.percent!=null||m.unit==='percent');
 const triple=ring&&selected.length===3;
 const left=ring&&(position==='left'||triple);
 const sizes=logoSizes[family as keyof typeof logoSizes]??logoSizes.tokenplan;
 const side=(ring&&!left?sizes[selected.length>1?1:0]:selected.length?28:32)*.7;
 const rings=<svg className="tray-rings" width="28" height="28" viewBox="0 0 40 40" aria-hidden="true">{selected.map((m,i)=>{
  const percent=m.hasData?Math.max(0,Math.min(100,m.percent??0)):0;
  return <g key={i}><circle cx="20" cy="20" r={17.5-i*4.5} fill="none" stroke="currentColor" opacity=".32" strokeWidth="2.6"/>{percent>0&&<circle cx="20" cy="20" r={17.5-i*4.5} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" pathLength="100" strokeDasharray={`${percent} 100`} transform="rotate(-90 20 20)"/>}</g>;
 })}{triple&&badge!=null&&<text className="tray-center-badge" x="20" y="24.5" textAnchor="middle" fill="currentColor" fontSize="13" fontWeight="600" opacity=".85">{badge<=9?badge:'+'}</text>}</svg>;
 const reading=(m:TrayMetric)=>!m.hasData?'—':m.percent!=null?`${Math.round(m.percent)}%`:m.amount!=null?(m.amount>=1000?`${Math.round(m.amount/1000)}k`:String(Math.round(m.amount))):'—';
 return <span className="tray-glyph" aria-hidden="true" data-layout={left?'left':'inside'} data-triple={triple}>
  <span className="tray-mark-cell" style={{'--mark-side':`${side}px`} as CSSProperties}>
   <ProviderLogo family={family}/>{ring&&!left&&rings}
  </span>
  {badge!=null&&!triple&&<sup className="tray-badge">{badge<=9?badge:'+'}</sup>}
  {left&&rings}
  {!ring&&selected.length>0&&<span className={`tray-values ${selected.length===3?'three-values':''}`}>{selected.map((m,i)=><span key={i}>{reading(m)}</span>)}</span>}
 </span>;
}

export function RingLayoutPicker({value,onChange,disabled,tr}:{value:string;onChange:(value:string)=>void;disabled:boolean;tr:(s:string)=>string}) {
 const metric=(percent:number):TrayMetric=>({percent,hasData:true,amount:null,unit:'percent'});
 return <div className="ring-layout-picker">
  <div className="ring-layout-options" role="group" aria-label={tr('Icon Position')}>
   {(['inside','left'] as const).map(position=><Button key={position} variant="secondary" className="ring-layout-option" aria-pressed={value===position} disabled={disabled} onClick={()=>onChange(position)}>
    <span className="ring-layout-card-content"><TrayGlyph family="claude" position={position} metrics={(position==='inside'?[65,35]:[65,40,20]).map(metric)}/>
    <span>{tr(position==='inside'?'Inside the Ring':'Left of the Rings')}</span></span>
   </Button>)}
  </div>
 </div>;
}
