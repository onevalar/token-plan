import {useId,type CSSProperties,type ReactNode} from 'react';
import {ChevronRight,Info} from 'lucide-react';
import {Button} from '../../src/components/arc/button/button';
import {format,exact,money,compact,metricLabel,valueOf,shortDate,canCompare,signed,type LabView,type Measure,type StudyProps,type Source} from './data';

export function SectionTitle({children,aside}:{children:ReactNode;aside?:ReactNode}) {
 return <div className="tp-section-title"><h3>{children}</h3>{aside&&<span>{aside}</span>}</div>;
}
export function Hero({view,measure,small=false}:{view:LabView;measure:Measure;small?:boolean}) {
 const current=valueOf(view.total,measure),prior=valueOf(view.previous,measure);
 const comparable=canCompare(view,measure)&&current!==null&&prior!==null;
 return <div className={`tp-hero${small?' tp-hero-small':''}`}>
  <span className="tp-caption">{metricLabel(measure)}{measure==='cost'&&!view.costComplete?' · 仅已知部分':''}</span>
  <div className="tp-hero-number" data-testid="hero-total" data-value={current??'unknown'}>{format(current,measure)}<small>{measure==='tokens'?'tokens':'USD'}</small></div>
  <p className="tp-comparison">{comparable?<><span>{signed(current-prior,measure)}</span> 较前一等长期间{prior>0?`（${current>=prior?'+':'−'}${(Math.abs(current-prior)/prior*100).toFixed(1)}%）`:prior===0&&current>0?'（前期为零，不计算增长率）':''}</>:<span>记录不完整，不判断增长或减少</span>}</p>
 </div>;
}
export function StatStrip({view}:{view:LabView}) {
 return <dl className="tp-stat-strip"><div><dt>已知费用</dt><dd>{format(view.total.cost,'cost')}<small>USD{!view.costComplete?' · 部分或未知':''}</small></dd></div><div><dt>活跃日期</dt><dd>{view.active}<small>/ {view.length} 天</small></dd></div><div><dt>记录覆盖</dt><dd>{view.covered}<small>/ {view.length} 天</small></dd></div></dl>;
}
export function ProviderMark({source}:{source:Pick<Source,'key'|'name'|'color'>}) {
 return <span className="tp-provider-mark" style={{'--source-color':source.color,maskImage:`url(/providers/${source.key}.svg)`,WebkitMaskImage:`url(/providers/${source.key}.svg)`} as CSSProperties} aria-hidden="true"/>;
}
export function SourceList({view,measure,selected,onSelect,bars=true}:{view:LabView;measure:Measure;selected:string|null;onSelect:(key:string|null)=>void;bars?:boolean}) {
 const total=valueOf(view.total,measure);
 return <div className="tp-sources" aria-label="来源明细">{view.sources.map(source=>{
  const value=valueOf(source,measure),share=total&&value!==null?value/total:0;
  return <button key={source.key} type="button" className="tp-source-row" aria-pressed={selected===source.key} onClick={()=>onSelect(selected===source.key?null:source.key)} style={{'--source-color':source.color} as CSSProperties}>
   <ProviderMark source={source}/><span className="tp-source-name">{source.name}{bars&&<span className="tp-mini-track" aria-hidden="true"><i style={{width:`${share*100}%`}}/></span>}</span>
   <span className="tp-source-number">{format(value,measure)}<small>{value===null?'未记录费用':total===0?'占比不适用':`${(share*100).toFixed(1)}%`}{measure==='cost'&&source.knownCosts<source.records&&value!==null?' · 部分':''}</small></span><ChevronRight size={14} aria-hidden="true"/>
  </button>;
 })}</div>;
}
export function SourceDetail({view,selected,measure,onClose}:{view:LabView;selected:string|null;measure:Measure;onClose:()=>void}) {
 const source=view.sources.find(s=>s.key===selected);
 if(!source)return null;
 const value=valueOf(source,measure),total=valueOf(view.total,measure);
 return <section className="tp-source-detail" tabIndex={-1} aria-label={`${source.name} 模型明细`}>
  <SectionTitle aside={<Button variant="ghost" size="sm" onClick={onClose}>收起</Button>}>{source.name} · 模型明细</SectionTitle>
  <p className="tp-source-detail-total">{format(value,measure,false)}<span>{measure==='tokens'?' tokens':''}{value!==null&&total!==null&&total>0?` · 占${metricLabel(measure)} ${(value/total*100).toFixed(2)}%`:''}</span></p>
  <p className="tp-caption">{view.bounds.start} 至 {view.bounds.end} · 固定示例记录</p>
  <dl className="tp-model-list">{source.models.map(model=><div key={model.name}><dt>{model.name}</dt><dd>{format(valueOf(model,measure),measure,false)}</dd></div>)}</dl>
 </section>;
}
export function DayReadout({view,day,measure}:{view:LabView;day:string|null;measure:Measure}) {
 const selected=view.days.find(d=>d.date===day)??view.days.at(-1)!;
 const entries=view.rows.filter(r=>r.date===selected.date);
 return <div className="tp-day-readout" data-testid="day-readout">
  <div><span>{selected.date}</span><strong>{selected.records?format(valueOf(selected,measure),measure,false):'没有记录'}<small>{selected.records&&measure==='tokens'?' tokens':''}</small></strong></div>
  <p className="tp-caption">{!selected.records?'这一天未知，不能当作零。':selected.partial&&measure==='cost'?'只显示已知费用，不能作为当日完整账单。':`${entries.length} 份${entries.some(r=>!r.account)?'账号或设备':'账号'}记录。选择其他日期继续查看。`}</p>
 </div>;
}
export function Sparkline({values,color='var(--accent)',height=48}:{values:(number|null)[];color?:string;height?:number}) {
 const max=Math.max(1,...values.filter((v):v is number=>v!==null));
 const point=(v:number,i:number)=>`${i/(Math.max(values.length-1,1))*200},${height-4-v/max*(height-8)}`;
 let path='';
 values.forEach((v,i)=>{if(v!==null)path+=`${i===0||values[i-1]===null?'M':'L'}${point(v,i)} `;});
 return <svg className="tp-sparkline" viewBox={`0 0 200 ${height}`} preserveAspectRatio="none" aria-hidden="true"><path d={path} stroke={color} fill="none" strokeWidth="1.8" vectorEffect="non-scaling-stroke"/></svg>;
}
export function MiniBars({view,measure,onDay,day}:{view:LabView;measure:Measure;onDay:(date:string)=>void;day:string|null}) {
 const days=view.days.slice(-7),max=Math.max(1,...days.map(d=>valueOf(d,measure)??0));
 return <div className="tp-mini-bars" aria-label="最近日期用量">{days.map(d=>{
  const value=valueOf(d,measure);
  return <button type="button" key={d.date} onClick={()=>onDay(d.date)} aria-pressed={day===d.date} aria-label={`${d.date}，${value===null?'未知':format(value,measure,false)}`}>
   <span className="tp-mini-bar-track" aria-hidden="true">{value===null?<b>?</b>:value===0?<i className="tp-zero-dot"/>:<i style={{height:`${value/max*100}%`}}/>}</span><span>{shortDate(d.date)}</span>
  </button>;
 })}</div>;
}
export function Coverage({view}:{view:LabView}) {
 return <div className="tp-coverage"><Info size={14} aria-hidden="true"/><p>已记录 {view.covered}/{view.length} 天，{view.total.knownCosts}/{view.total.records} 条费用已知。{view.partial?'缺失不补零。':'仅代表本地已有记录。'}{view.total.knownCosts<view.total.records?' 费用未知不等于免费。':''}</p></div>;
}
export function ExactRecords({view}:{view:LabView}) {
 const id=useId();
 return <details className="tp-exact"><summary>核对精确记录 <span>{view.total.records} 条</span></summary><div className="tp-table-scroll" tabIndex={0} role="region" aria-labelledby={id}>
  <table><caption id={id}>已记录的日期、Tokens 和已知费用（USD）</caption><thead><tr><th scope="col">日期</th><th scope="col">Tokens</th><th scope="col">费用</th></tr></thead><tbody>{view.days.map(d=><tr key={d.date}><th scope="row">{d.date}</th><td>{exact(d.tokens)}</td><td>{money(d.cost)}{d.partial&&d.cost!==null?'（部分）':''}</td></tr>)}</tbody></table>
 </div></details>;
}
export function NoValues({measure,unknown=false}:{measure:Measure;unknown?:boolean}) {
 return <div className="tp-no-values"><span className="tp-dash">{unknown?'?':'0'}</span><h3>{unknown?'费用尚未记录':`有记录，${measure==='cost'?'费用':'用量'}为零`}</h3><p>{unknown?'保留未知，不显示为免费。可以切换 Tokens 查看已有用量。':'没有正数可分配比例，因此不绘制虚假的占比图。'}</p></div>;
}
export function ReviewFoot({children}:{children:ReactNode}) {return <p className="tp-chart-note">{children}</p>;}
export type {StudyProps};
