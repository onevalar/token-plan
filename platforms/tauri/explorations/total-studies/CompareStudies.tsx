import {useId,useState,type CSSProperties,type KeyboardEvent,type ReactNode} from 'react';
import SegmentedControl from './arc/segmented-control/segmented-control';
import {ProviderMark,ReviewFoot,SectionTitle} from './Shared';
import {canCompare,format,shortDate,unit,valueOf,type Day,type LabView,type Measure,type Source,type StudyProps} from './data';
import './compare-studies.css';

type Controls=Pick<StudyProps,'selected'|'onSelect'>;
const amountUnits=(value:number,measure:Measure)=>measure==='cost'?Math.round(value*100):value;
const fromUnits=(value:number,measure:Measure)=>measure==='cost'?value/100:value;
const deltaText=(value:number,measure:Measure)=>`${value>0?'+':value<0?'−':''}${format(Math.abs(value),measure,false)}`;
const dates=(bounds:{start:string;end:string})=>bounds.start===bounds.end?shortDate(bounds.start):`${shortDate(bounds.start)}–${shortDate(bounds.end)}`;
const extent=(values:(number|null)[])=>{
 const known=values.filter((value):value is number=>value!==null);
 return known.length?Math.max(0,...known):null;
};
const completeDays=(days:Day[],length:number,measure:Measure)=>days.length===length&&days.every(day=>day.records>0&&(measure==='tokens'||!day.partial&&day.cost!==null));

function comparisonIssue(view:LabView,measure:Measure) {
 if(view.days.length!==view.previousDays.length||view.days.length!==view.length)return '两期天数不同，不计算增减。';
 if(!view.total.records||!view.previous.records)return '本期或上期没有记录；未知不按零计算，暂不判断增减。';
 if(view.covered<view.length||view.previousCovered<view.length)return '两期存在缺失日期；只列已有记录，不补零、不判断增减。';
 if(measure==='cost'&&(!view.costComplete||view.previous.knownCosts<view.previous.records))return '两期费用尚未完整；只列已知金额，不计算差额，未知不等于免费。';
 if(!canCompare(view,measure))return '记录标记为不完整，暂不判断增长或减少。';
 return null;
}

function sourcePair(source:Source,view:LabView,measure:Measure) {
 const current=valueOf(source,measure),previous=valueOf(source.previous,measure);
 const comparable=!comparisonIssue(view,measure)&&completeDays(source.days,view.length,measure)&&completeDays(source.previousDays,view.length,measure);
 return {current,previous,delta:comparable&&current!==null&&previous!==null
  ?fromUnits(amountUnits(current,measure)-amountUnits(previous,measure),measure):null};
}

function moveSource(event:KeyboardEvent<HTMLButtonElement>) {
 const keys=['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'];
 if(!keys.includes(event.key))return;
 const buttons=Array.from(event.currentTarget.closest('[data-source-list]')!.querySelectorAll<HTMLButtonElement>('button[data-source]'));
 const index=buttons.indexOf(event.currentTarget),last=buttons.length-1;
 const target=event.key==='Home'?0:event.key==='End'?last
  :event.key==='ArrowDown'||event.key==='ArrowRight'?(index+1)%buttons.length:(index+last)%buttons.length;
 event.preventDefault();
 event.stopPropagation();
 buttons[target].focus();
}

function SourceButton({source,controls,className,children,label}:{source:Source;controls:Controls;className:string;children:ReactNode;label?:string}) {
 return <button type="button" className={`tp-compare-source-button ${className}`} data-source={source.key}
  aria-label={label} aria-pressed={controls.selected===source.key}
  style={{'--source-color':source.color} as CSSProperties}
  onClick={()=>controls.onSelect(controls.selected===source.key?null:source.key)} onKeyDown={moveSource}>
  {children}
 </button>;
}

function PeriodTotals({view,measure}:{view:LabView;measure:Measure}) {
 return <dl className="tp-compare-totals">{(['previous','current'] as const).map(period=>{
  const prior=period==='previous',value=valueOf(prior?view.previous:view.total,measure);
  return <div key={period}>
   <dt><i className={`tp-compare-dot ${prior?'is-prior':'is-current'}`} aria-hidden="true"/>{prior?'上期':'本期'}<span>{dates(prior?view.priorBounds:view.bounds)}</span></dt>
   <dd data-testid={prior?undefined:'hero-total'} data-value={prior?undefined:(value??'unknown')}>{format(value,measure,false)}</dd>
  </div>;
 })}</dl>;
}

function PairValues({source,measure}:{source:Source;measure:Measure}) {
 return <span className="tp-compare-values">{(['current','previous'] as const).map(period=>{
  const prior=period==='previous',item=prior?source.previous:source,days=prior?source.previousDays:source.days;
  const value=valueOf(item,measure),partial=value!==null&&(days.some(day=>!day.records)||measure==='cost'&&item.knownCosts<item.records);
  return <span className="tp-compare-value" key={period}>
   <span className="tp-compare-sr-only">{prior?'上期':'本期'} </span>
   <i className={`tp-compare-dot ${prior?'is-prior':'is-current'}`} aria-hidden="true"/>
   <span><b>{format(value,measure,false)}</b>{partial&&<small>部分记录</small>}</span>
  </span>;
 })}</span>;
}

function Dumbbells(props:StudyProps) {
 const {view,measure}=props,issue=comparisonIssue(view,measure);
 const maximum=extent(view.sources.flatMap(source=>[valueOf(source,measure),valueOf(source.previous,measure)]));
 const x=(value:number)=>8+value/(maximum||1)*224;
 return <>
  <SectionTitle aside={`${view.length} 天 / 期 · ${unit(measure)}`}>双点对照</SectionTitle>
  <PeriodTotals view={view} measure={measure}/>
  <p className="tp-compare-context">{issue??'同一刻度，看清每个来源的两期差距。'}</p>
  <div className="tp-compare-dumbbell-head" aria-hidden="true">
   <span className="tp-compare-ruler"><span>0</span><span>{maximum===null?'刻度未知':format(maximum,measure)}</span></span>
   <span>两期精确值</span>
  </div>
  <div className="tp-compare-dumbbells" data-source-list role="group" aria-label="来源双点对照，方向键浏览来源，Enter 打开明细">
   {view.sources.map(source=>{
    const pair=sourcePair(source,view,measure);
    return <SourceButton key={source.key} source={source} controls={props} className="tp-compare-dumbbell-row">
     <span className="tp-compare-source-name"><ProviderMark source={source}/><strong>{source.name}</strong></span>
     <span className="tp-compare-difference">{pair.delta===null?'暂不比较':pair.delta===0?'两期相同':deltaText(pair.delta,measure)}</span>
     <svg className="tp-compare-dumbbell" viewBox="0 0 240 44" aria-hidden="true">
      <path d="M8 22H232 M8 17V27 M120 19V25 M232 17V27" className="tp-compare-grid-line"/>
      {pair.delta!==null&&<line x1={x(pair.previous!)} x2={x(pair.current!)} y1="22" y2="22" className="tp-compare-join"/>}
      {pair.previous!==null&&<circle cx={x(pair.previous)} cy="22" r="5" className="tp-compare-prior-point"/>}
      {pair.current!==null&&<circle cx={x(pair.current)} cy="22" r="3.3" className="tp-compare-current-point"/>}
     </svg>
     <PairValues source={source} measure={measure}/>
    </SourceButton>;
   })}
  </div>
  <ReviewFoot>实心为本期，空心为上期；所有来源从零起算、共用刻度。{issue?'不完整的两期不连线。':'连接线只表示差距，不代表好坏。'}方向键浏览来源，Enter 或空格打开明细；也可点选来源。</ReviewFoot>
 </>;
}

function TrendPlot({source,measure,maximum}:{source:Source;measure:Measure;maximum:number|null}) {
 const values=source.days.map(day=>valueOf(day,measure)),previous=source.previousDays.map(day=>valueOf(day,measure));
 const x=(index:number)=>values.length===1?120:6+index/(values.length-1)*228;
 const y=(value:number)=>70-value/(maximum||1)*62;
 const path=(series:(number|null)[])=>series.map((value,index)=>value===null?'':`${index===0||series[index-1]===null?'M':'L'}${x(index)},${y(value)}`).join(' ');
 return <svg className="tp-compare-trend" viewBox="0 0 240 80" aria-hidden="true">
  <path d="M6 8H234 M6 39H234 M6 70H234" className="tp-compare-grid-line"/>
  <path d={path(previous)} className="tp-compare-prior-line"/>
  <path d={path(values)} className="tp-compare-current-line"/>
  {previous.map((value,index)=>value!==null&&<circle key={`p-${index}`} cx={x(index)} cy={y(value)} r="2.6" className="tp-compare-prior-point"/>)}
  {values.map((value,index)=>value!==null&&<circle key={`c-${index}`} cx={x(index)} cy={y(value)} r="1.8" className="tp-compare-current-point"/>)}
 </svg>;
}

function ParallelTrends(props:StudyProps) {
 const {view,measure}=props,[scale,setScale]=useState('shared'),scaleId=useId();
 const issue=comparisonIssue(view,measure);
 const sharedMax=extent(view.sources.flatMap(source=>[...source.days,...source.previousDays].map(day=>valueOf(day,measure))));
 return <>
  <SectionTitle aside={`${view.length} 天 / 期 · ${unit(measure)}`}>并行小图</SectionTitle>
  <PeriodTotals view={view} measure={measure}/>
  <div className="tp-compare-scale-control" aria-describedby={scaleId}>
   <SegmentedControl label="趋势纵轴刻度" value={scale} onValueChange={setScale}
    options={[{value:'shared',label:'共用刻度'},{value:'independent',label:'各自刻度'}]}/>
  </div>
  <p className="tp-compare-scale-note" id={scaleId} role="status">{scale==='shared'
   ?'所有图共用纵轴，线的高度可比较绝对用量。'
   :'每个来源单独缩放，只比较形状，不能横比用量。'}</p>
  {issue&&<p className="tp-compare-context">{issue}</p>}
  <div className="tp-compare-trends" data-source-list role="group" aria-label="来源每日趋势，方向键浏览来源，Enter 打开明细">
   {view.sources.map(source=>{
    const maximum=scale==='shared'?sharedMax:extent([...source.days,...source.previousDays].map(day=>valueOf(day,measure)));
    return <SourceButton key={source.key} source={source} controls={props} className="tp-compare-trend-card">
     <span className="tp-compare-source-name"><ProviderMark source={source}/><strong>{source.name}</strong></span>
     <span className="tp-compare-domain">{maximum===null?'刻度未知':maximum===0?'仅零值':`0–${format(maximum,measure)}`}</span>
     <span className="tp-compare-trend-frame" data-scale-max={maximum??'unknown'}>
      <TrendPlot source={source} measure={measure} maximum={maximum}/>
      <span className="tp-compare-time-axis"><span>第 1 天</span>{view.length>1&&<span>第 {view.length} 天</span>}</span>
     </span>
     <PairValues source={source} measure={measure}/>
    </SourceButton>;
   })}
  </div>
  <ReviewFoot>实线、实心点为本期；虚线、空心点为上期。两期按第 1 天对齐，断线保留未知，精确数字为期间合计。{view.length===1?'只有一天，不构造趋势。':''}方向键浏览来源，Enter 或空格打开明细；也可点选小图。</ReviewFoot>
 </>;
}

type WaterStep={key:string;name:string;from:number;to:number;delta:number;source?:Source};

function Waterfall(props:StudyProps) {
 const {view,measure}=props,current=valueOf(view.total,measure),previous=valueOf(view.previous,measure);
 const pairs=view.sources.map(source=>({source,...sourcePair(source,view,measure)}));
 let issue=comparisonIssue(view,measure);
 if(!issue&&pairs.some(pair=>pair.delta===null))issue='部分来源缺少完整记录，暂不拆解总差额。';
 // Accumulate integer cents (or whole tokens), so every step reconciles exactly.
 const start=previous===null?null:amountUnits(previous,measure),end=current===null?null:amountUnits(current,measure);
 if(!issue&&(start===null||end===null
  ||pairs.reduce((sum,pair)=>sum+amountUnits(pair.previous!,measure),0)!==start
  ||pairs.reduce((sum,pair)=>sum+amountUnits(pair.current!,measure),0)!==end))issue='来源记录尚不能完整对齐两期总数，暂不拆解差额。';
 const steps:WaterStep[]=[];
 if(!issue) {
  let running=start!;
  steps.push({key:'previous',name:'上期',from:0,to:running,delta:running});
  pairs.forEach(({source,delta})=>{
   const change=amountUnits(delta!,measure);
   steps.push({key:source.key,name:source.name,from:running,to:running+change,delta:change,source});
   running+=change;
  });
  steps.push({key:'current',name:'本期',from:0,to:end!,delta:end!});
 }
 const peak=Math.max(0,...steps.flatMap(step=>[step.from,step.to])),ceiling=peak*1.14;
 const percent=(value:number)=>value/(ceiling||1)*100;
 const net=issue?null:fromUnits(end!-start!,measure);
 return <>
  <SectionTitle aside={`${view.length} 天 / 期 · ${unit(measure)}`}>变化拆解</SectionTitle>
  <div className="tp-compare-net">
   <span className="tp-caption">{issue?'先保留两期记录':'本期 − 上期'}</span>
   <strong>{net===null?'暂不拆解差额':deltaText(net,measure)}</strong>
   <span className="tp-caption">{net===null?issue:net===0?'净变化为零；不代表各来源都没有变化。':'增加或减少只描述消耗，不代表好坏。'}</span>
  </div>
  {!issue&&<div className="tp-compare-waterfall" role="group" aria-label="从上期总量到本期总量的变化瀑布图，方向键浏览来源，Enter 打开明细">
   <div className="tp-compare-water-axis" aria-hidden="true">
    <span>{format(fromUnits(ceiling,measure),measure)}</span>
    <span>{peak===0?'':format(fromUnits(ceiling/2,measure),measure)}</span><span>0</span>
   </div>
   <div className="tp-compare-water-steps" style={{'--step-count':steps.length} as CSSProperties} data-source-list>
    {steps.map((step,index)=>{
     const graphic=<>
      <span className="tp-compare-step-space" aria-hidden="true">
       <i className={`tp-compare-water-bar${step.key==='previous'?' is-prior-total':''}${step.key==='current'?' is-current-total':''}${step.delta===0?' is-zero':''}`}
        style={{bottom:`${percent(Math.min(step.from,step.to))}%`,height:`${percent(Math.abs(step.to-step.from))}%`}}/>
       {index<steps.length-1&&<i className="tp-compare-water-connector" style={{bottom:`${percent(step.to)}%`}}/>}
       {step.source&&<b className="tp-compare-water-sign" style={{bottom:`calc(${percent(Math.max(step.from,step.to))}% + 5px)`}}>{step.delta>0?'+':step.delta<0?'−':'='}</b>}
      </span>
      <span className="tp-compare-step-label">{step.source?String(index).padStart(2,'0'):step.name}</span>
     </>;
     return step.source?<SourceButton key={step.key} source={step.source} controls={props} className="tp-compare-water-step"
      label={`${step.name}，变化 ${deltaText(fromUnits(step.delta,measure),measure)} ${unit(measure)}，打开模型明细`}>{graphic}</SourceButton>
      :<div key={step.key} className="tp-compare-water-total">{graphic}</div>;
    })}
   </div>
  </div>}
  <PeriodTotals view={view} measure={measure}/>
  <div className="tp-compare-contribution-head"><span>{issue?'已有来源记录':'来源贡献'}</span><span>{issue?'两期精确值':`增减 · ${unit(measure)}`}</span></div>
  <div className="tp-compare-contributions" data-source-list role="group" aria-label="来源变化明细，方向键浏览来源，Enter 打开明细">
   {pairs.map(({source,delta},index)=><SourceButton key={source.key} source={source} controls={props} className="tp-compare-contribution">
    <span className="tp-compare-source-name"><span className="tp-compare-index">{String(index+1).padStart(2,'0')}</span><ProviderMark source={source}/><strong>{source.name}</strong></span>
    {issue?<PairValues source={source} measure={measure}/>:<span className="tp-compare-contribution-value"><b>{deltaText(delta!,measure)}</b><small>{delta===0?'无变化':delta!>0?'增加':'减少'}</small></span>}
   </SourceButton>)}
  </div>
  <ReviewFoot>{issue?'记录补全后才绘制瀑布，不用零差额代替未知。':'从空心上期总量出发，逐项加减，抵达实心本期总量。颜色只标识来源；零差额画短线。'}方向键浏览来源，Enter 或空格打开明细；也可点选{issue?'来源':'台阶或来源'}。</ReviewFoot>
 </>;
}

export function CompareStudies(props:StudyProps) {
 const selected=props.view.sources.find(source=>source.key===props.selected);
 return <section className={`tp-compare tp-compare-d${props.variant+1}`} aria-label={['双点对照','并行小图','变化拆解'][props.variant]}>
  {props.variant===0?<Dumbbells {...props}/>:props.variant===1?<ParallelTrends {...props}/>:<Waterfall {...props}/>}
  <p className="tp-compare-sr-only" role="status">{selected?`已选择 ${selected.name}，模型明细在图表下方。`:'未单独选择来源。'}</p>
 </section>;
}
