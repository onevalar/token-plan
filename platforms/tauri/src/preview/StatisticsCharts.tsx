import {useId,useState} from 'react';
import {Select} from '../components/arc/select/select';
import {providerText} from '../providerText';
import {historyColor} from '../historyModel';
import {activityDays,sourceParts,treeRects,quotaSeries} from '../statisticsModel';
import type {historyRows,Account} from '../desktop';
type Props={rows:ReturnType<typeof historyRows>;range:string;language:string};
const exact=(v:number,language:string)=>v.toLocaleString(language,{maximumFractionDigits:2});
export function ActivityChart({rows,range,language,style}:Props&{style:string}) {
 const tr=(s:string)=>providerText(s,language),days=activityDays(rows,range),max=Math.max(1,...days.map(d=>d.value??0));
 const [hovered,setHovered]=useState<string|null>(null),tooltipID=useId();
 const selected=days.find(d=>d.date===hovered);
 const reading=(d:typeof days[number])=>`${d.date}: ${d.value==null?tr('No Recorded Data'):exact(d.value,language)+' token'}`;
 const offset=new Date(`${days[0].date}T12:00:00`).getDay();
 return <><p className="statistics-caption">{tr('Daily Token Usage')}</p><div className="statistics-chart-interactive">{selected&&<div className="statistics-tooltip" id={tooltipID} role="tooltip">{reading(selected)}</div>}<div className={`statistics-activity ${style==='Activity Calendar'?'statistics-calendar':style==='Folded Bands'?'statistics-horizon':'statistics-bars'}`} role="list">
 {style==='Activity Calendar'&&Array.from({length:offset},(_,i)=><span key={`blank-${i}`} aria-hidden="true"/>)}
 {days.map(d=><div role="listitem" key={d.date} className="statistics-day" tabIndex={0} onMouseEnter={()=>setHovered(d.date)} onMouseLeave={()=>setHovered(null)} onFocus={()=>setHovered(d.date)} onBlur={()=>setHovered(null)} onKeyDown={e=>{if(e.key==='Escape')setHovered(null);}} aria-describedby={hovered===d.date?tooltipID:undefined} data-missing={d.value==null} aria-label={`${d.date}: ${d.value==null?tr('No Recorded Data'):exact(d.value,language)+' token'}`}>
 {style==='Folded Bands'?<svg viewBox="0 0 10 40" preserveAspectRatio="none" aria-hidden="true">{d.value!=null&&[0,1,2].map(band=>{const height=Math.max(0,Math.min(1,d.value!/max*3-band))*40;return <rect key={band} x="0" y={40-height} width="10" height={height} fill={`var(--statistics-band-${band})`}/>;})}</svg>:<span className="statistics-day-fill" style={style==='Activity Calendar'?{opacity:d.value==null?0:.12+.88*d.value/max}:{height:d.value==null?0:`${d.value/max*100}%`}}/>}
 {style==='Activity Calendar'&&<span className="statistics-date">{Number(d.date.slice(-2))}</span>}
 </div>)}</div></div><div className="statistics-axis"><span>{days[0].date}</span><span>{days.at(-1)!.date}</span></div>
 {style==='Folded Bands'&&<p className="statistics-caption">{tr('Each darker band adds')}: {exact(max/3,language)} token</p>}
 <p className="statistics-caption">{tr('Empty cells have no recorded data, not zero usage.')}</p>
 </>;
}
export function SourcesChart({rows,language,style}:Props&{style:string}) {
 const tr=(s:string)=>providerText(s,language),parts=sourceParts(rows),sum=parts.reduce((n,p)=>n+p.value,0);
 if(!sum)return <p>{tr('No Recorded Data')}</p>;
 return <><p className="statistics-caption">{tr('Share of Recorded Tokens')}</p>{style==='Source Treemap'&&<svg className="statistics-tree" viewBox="0 0 100 60" role="img" aria-label={tr('Source Composition')}>{treeRects(parts).map(p=><rect key={p.label} x={p.x} y={p.y} width={p.w} height={p.h} fill={historyColor(p.label)} stroke="var(--surface)" strokeWidth=".3"/>)}</svg>}
 <ol className="statistics-sources">{parts.map(p=><li key={p.label}><i style={{background:historyColor(p.label)}}/><span>{p.label}<small>{exact(p.value,language)} token</small></span><strong>{(p.value/sum).toLocaleString(language,{style:'percent',maximumFractionDigits:1})}</strong></li>)}</ol></>;
}
export function QuotaChart({accounts,range,language,style}:{accounts:Account[];range:string;language:string;style:string}) {
 const tr=(s:string)=>providerText(s,language),series=quotaSeries(accounts,range),[selected,setSelected]=useState('');
 const current=series.find(s=>s.id===selected)??series[0];
 if(!current)return <p>{tr('No Recorded Data')}</p>;
 const points=current.points,percent=current.unit==='percent',valid=points.filter(p=>p.value!=null),start=Date.parse(points[0].date),end=Date.parse(points.at(-1)!.date);
 const maximum=percent?100:Math.max(1,...valid.map(p=>p.value!));
 const xy=(p:typeof points[number])=>({x:end===start?174:40+(Date.parse(p.date)-start)/(end-start)*268,y:108-(percent?Math.max(0,100-p.value!):p.value!)/maximum*96});
 // Never connect missing readings, long gaps, or quota resets. No extrapolated trajectory.
 return <><Select label={tr('Account and Metric')} value={current.id} onValueChange={setSelected} options={series.map(s=>({value:s.id,label:s.name}))}/>
 {style==='Quota Line'&&<><p className="statistics-caption">{percent?tr('Recorded Remaining Quota'):tr('Recorded Value')}</p><svg className="statistics-line" viewBox="0 0 320 120" role="img" aria-label={tr('Quota Changes')}>
 <text x="0" y="14">{exact(maximum,language)}{percent?'%':''}</text><text x="0" y="110">0</text>
 {points.map((p,i)=>{if(p.value==null)return null;const pos=xy(p),prior=points[i-1];const join=prior?.value!=null&&Date.parse(p.date)-Date.parse(prior.date)<=90*60000&&(!percent||p.value>=prior.value);return <g key={`${p.date}-${i}`}>{join&&<line x1={xy(prior).x} y1={xy(prior).y} x2={pos.x} y2={pos.y}/>}<circle cx={pos.x} cy={pos.y} r="2.5"/></g>;})}</svg><div className="statistics-axis"><span>{new Date(start).toLocaleString(language)}</span><span>{new Date(end).toLocaleString(language)}</span></div><p className="statistics-caption">{tr('Actual samples only; gaps and resets are not connected.')}</p></>}
 <p className="statistics-caption">{percent?tr('Used'):tr('Recorded Value')}</p><details open={style==='Observation List'}><summary>{tr('Exact Readings')}</summary><div className="statistics-readings">{points.map((p,i)=><div key={i}><span>{new Date(p.date).toLocaleString(language)}</span><span>{p.value==null?'—':`${exact(p.value,language)} ${percent?'%':p.unit??''}`}</span></div>)}</div></details></>;
}
