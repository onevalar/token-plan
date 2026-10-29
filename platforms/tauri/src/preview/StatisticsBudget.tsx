import {useEffect,useState,type CSSProperties} from 'react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {RulerSlider} from '../components/arc/ruler-slider/ruler-slider';
import {SectionTitle,SourceList,ReviewFoot} from './StatisticsShared';
import {statisticsCopy,type StatisticsChartProps} from '../statisticsData';
import {useCostReference,validCostReference,maximumCostReference} from './useCostReference';
import './statistics-budget.css';

function Needle({ratio,language}:{ratio:number|null;language:string}) {
 const {tr}=statisticsCopy(language),at=(radius:number,angle:number)=>({x:160+radius*Math.sin(angle*Math.PI/180),y:145-radius*Math.cos(angle*Math.PI/180)});
 return <div className="tp-needle-dial"><svg viewBox="0 0 320 245" aria-hidden="true">
  <circle cx={160} cy={145} r={104} className="tp-dial-face"/>
  {Array.from({length:61},(_,index)=>{const angle=-120+index*4,a=at(index%5===0?105:111,angle),b=at(121,angle);return <line key={index} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={ratio!==null&&index/60<=Math.min(1,ratio)?'tp-dial-tick is-filled':'tp-dial-tick'}/>;})}
  {[0,25,50,75,100].map(value=>{const point=at(139,-120+value*2.4);return <text key={value} x={point.x} y={point.y+4} textAnchor="middle">{value}</text>;})}
  {ratio!==null&&<g className="tp-dial-needle" style={{transform:`rotate(${-120+Math.min(1,ratio)*240}deg)`}}><path d="M157 151 L160 52 L163 151 Z"/><line x1={160} y1={145} x2={160} y2={165}/></g>}<circle cx={160} cy={145} r={8} className="tp-dial-pin"/>
 </svg><div className="tp-dial-value"><strong>{ratio===null?'—':`${(ratio*100).toLocaleString(language,{maximumFractionDigits:1})}%`}</strong><span>{tr(ratio===null?'Reference Not Active':'Known Cost / Reference')}</span></div></div>;
}
function Battery({ratio,incomplete,language}:{ratio:number|null;incomplete:boolean;language:string}) {
 const {tr}=statisticsCopy(language);
 return <><div className="tp-battery" data-unknown={ratio===null} data-partial={incomplete} aria-hidden="true">
  {Array.from({length:40},(_,index)=><i key={index}><span style={{transform:`scaleX(${ratio===null?0:Math.max(0,Math.min(1,ratio*40-index))})`}}/></i>)}
 </div><p className="tp-battery-caption">{ratio===null?tr('Reference Not Active'):tr('%@% of the Personal Reference',(ratio*100).toLocaleString(language,{maximumFractionDigits:1}))}</p>
 <ReviewFoot>{tr('40 cells show the recorded ratio. Empty cells are not a provider balance.')}</ReviewFoot></>;
}
function Target({cost,budget,language}:{cost:number|null;budget:number;language:string}) {
 const ceiling=Math.max(200,budget*1.2,(cost??0)*1.1),reference=budget/ceiling*100,{tr,format}=statisticsCopy(language);
 return <div className="tp-target"><div className="tp-target-heading"><span>{tr('Known Cost')}</span><strong data-testid="hero-total" data-value={cost??'unknown'}>{format(cost,'cost')}</strong></div>
  <div className="tp-target-track" aria-hidden="true">{cost!==null&&<i style={{width:`${cost/ceiling*100}%`}}/>}{budget>0&&<span className="tp-target-marker" style={{left:`${reference}%`}}><span>{tr('Reference')}</span></span>}</div>
  <div className="tp-target-axis"><span>$0</span><span>{format(ceiling,'cost')}</span></div>
 </div>;
}
export function StatisticsBudget(props:StatisticsChartProps&{scope:string;range:string}) {
 const {view,variant,language,scope,range}=props,{tr,format,money}=statisticsCopy(language),reference=useCostReference(scope,range),{budget}=reference;
 const [draft,setDraft]=useState(String(budget)),[invalid,setInvalid]=useState(false);
 const scaleFor=(value:number)=>Math.min(maximumCostReference,Math.max(1000,Math.ceil(value/500)*500+500));
 const [ceiling,setCeiling]=useState(()=>scaleFor(budget));
 useEffect(()=>{setDraft(String(budget));setInvalid(false);},[budget]);
 const cost=view.total.cost,incomplete=!view.costComplete||view.partial,ratio=budget>0&&cost!==null?cost/budget:null;
 const over=cost!==null&&budget>0&&cost>budget;
 const difference=budget===0?tr('Reference Not Active'):cost===null?tr('Cost is unknown; the difference is unknown.'):over?
  tr(incomplete?'At least %@ above the reference.':'%@ above the reference.',money(cost-budget)):
  incomplete?tr('Incomplete records. The remaining difference is unknown.'):tr('%@ below the reference.',money(budget-cost));
 const apply=(value:number)=>{setCeiling(scaleFor(value));reference.change(value);reference.save(value);};
 const meter=ratio===null?{}:{role:'meter' as const,'aria-label':tr('Known Cost / Reference'),'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.min(100,ratio*100),'aria-valuetext':`${(ratio*100).toLocaleString(language,{maximumFractionDigits:1})}% · ${difference}`};
 return <div className={`tp-budget tp-budget-${variant}`} data-over={over} data-incomplete={incomplete} style={{'--budget-ink':over?'var(--warning)':'var(--accent)'} as CSSProperties}>
  <p className="tp-budget-context">{tr('Personal reference for the selected period, not a subscription quota.')}</p>
  {variant===2?<><Target cost={cost} budget={budget} language={language}/><div className="tp-budget-ruler"><RulerSlider label={tr('Drag to Adjust Reference')} value={budget} onValueChange={reference.change} onValueCommit={reference.save} min={0} max={ceiling} step={1} majorEvery={Math.max(50,Math.ceil(ceiling/100))} spacing={2} unit="USD" format={value=>value.toLocaleString(language)} animateReadout={false}/></div></>:<>
   <div className="tp-budget-total"><span className="tp-caption">{tr('Known Cost')}{incomplete?` · ${tr('Recorded Portion Only')}`:''}</span><strong data-testid="hero-total" data-value={cost??'unknown'}>{format(cost,'cost')}<small>USD</small></strong></div>
   <div {...meter}>{variant===0?<Needle ratio={ratio} language={language}/>:<Battery ratio={ratio} incomplete={incomplete} language={language}/>}</div>
  </>}
  <div className="tp-budget-difference" data-testid="budget-difference"><strong>{difference}</strong><span>{budget>0?`${tr('Reference')} ${money(budget)}`:tr('Set a reference to compare costs.')}</span></div>
  <form className="tp-budget-input" noValidate onSubmit={event=>{event.preventDefault();const value=Number(draft);if(!draft.trim()||!validCostReference(value)){setInvalid(true);return;}setInvalid(false);apply(value);}}>
   <Input label={tr('Personal Reference (USD)')} type="number" inputMode="numeric" min={0} max={maximumCostReference} step={1} value={draft} error={invalid?tr('Enter a whole amount between 0 and %@.',maximumCostReference.toLocaleString(language)):undefined} onChange={event=>{setDraft(event.target.value);setInvalid(false);}}/>
   <Button type="submit" variant="secondary">{tr(reference.saved&&draft===String(budget)?'Saved':'Apply')}</Button>
  </form>
  {reference.error&&<p className="inline-error" role="alert">{tr(reference.error)}</p>}
  <div className="tp-budget-presets" aria-label={tr('Reference Presets')}>{[0,100,200,500].map(value=><Button key={value} type="button" size="sm" variant="ghost" aria-pressed={budget===value} onClick={()=>apply(value)}>{value===0?tr('Off'):money(value)}</Button>)}</div>
  <ReviewFoot>{tr('Saved on this device for this account selection and time range. Zero disables comparison. No forecast is calculated.')}</ReviewFoot>
  <SectionTitle>{tr('Cost Sources')}</SectionTitle><SourceList {...props} measure="cost" bars={false}/>
 </div>;
}
