import {useEffect,useState,type CSSProperties} from 'react';
import {Button} from '../../src/components/arc/button/button';
import {Input} from '../../src/components/arc/input/input';
import {RulerSlider} from './arc/ruler-slider/ruler-slider';
import {SectionTitle,SourceList,ReviewFoot} from './Shared';
import {format,money,type StudyProps} from './data';
import './budget-studies.css';

function ReferenceInput({budget,onBudget}:{budget:number;onBudget:(value:number)=>void}) {
 const [draft,setDraft]=useState(String(budget)),[error,setError]=useState('');
 useEffect(()=>{setDraft(String(budget));setError('');},[budget]);
 return <><form className="tp-budget-input" noValidate onSubmit={event=>{
  event.preventDefault();const value=Number(draft);
  if(!draft.trim()||!Number.isFinite(value)||value<0||value>1000||!Number.isInteger(value)){setError('请输入 0–1000 的整数金额。');return;}
  setError('');onBudget(value);
 }}>
  <Input label="个人参考值（USD）" type="number" inputMode="numeric" min={0} max={1000} step={1} value={draft} error={error||undefined} onChange={event=>setDraft(event.target.value)}/>
  <Button type="submit" variant="secondary">应用</Button>
 </form><div className="tp-budget-presets" aria-label="参考金额预设">{[100,200,500].map(value=><Button key={value} type="button" size="sm" variant="ghost" aria-pressed={budget===value} onClick={()=>onBudget(value)}>${value}</Button>)}</div></>;
}
function Needle({ratio}:{ratio:number|null}) {
 const at=(radius:number,angle:number)=>({x:160+radius*Math.sin(angle*Math.PI/180),y:145-radius*Math.cos(angle*Math.PI/180)});
 return <div className="tp-needle-dial"><svg viewBox="0 0 320 245" aria-hidden="true">
  <circle cx={160} cy={145} r={104} className="tp-dial-face"/>
  {Array.from({length:61},(_,i)=>{
   const angle=-120+i*4,a=at(i%5===0?105:111,angle),b=at(121,angle);
   return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} className={ratio!==null&&i/60<=Math.min(1,ratio)?'tp-dial-tick is-filled':'tp-dial-tick'}/>;
  })}
  {[0,25,50,75,100].map(value=>{const p=at(139,-120+value*2.4);return <text key={value} x={p.x} y={p.y+4} textAnchor="middle">{value}</text>;})}
  {ratio!==null&&<g className="tp-dial-needle" style={{transform:`rotate(${-120+Math.min(1,ratio)*240}deg)`}}><path d="M157 151 L160 52 L163 151 Z"/><line x1={160} y1={145} x2={160} y2={165}/></g>}
  <circle cx={160} cy={145} r={8} className="tp-dial-pin"/>
 </svg><div className="tp-dial-value"><strong>{ratio===null?'—':`${(ratio*100).toFixed(1)}%`}</strong><span>{ratio===null?'暂不比较':'已知费用 / 参考值'}</span></div></div>;
}
function Battery({ratio,incomplete}:{ratio:number|null;incomplete:boolean}) {
 const filled=ratio===null?0:Math.round(Math.min(1,ratio)*40);
 return <><div className="tp-battery" data-unknown={ratio===null} data-partial={incomplete} aria-hidden="true">
  {Array.from({length:40},(_,i)=><i key={i} data-filled={i<filled}/>)}
 </div><p className="tp-battery-caption">{ratio===null?'尚无法显示比例':`已知费用为参考值的 ${(ratio*100).toFixed(1)}%`}</p>
 <ReviewFoot>40 格，每格约 2.5%。{incomplete?'虚线区域不表示可用余额；未知费用尚未计入。':'空格是与个人参考值的差额，不是服务商额度。'}</ReviewFoot></>;
}
function Target({cost,budget}:{cost:number|null;budget:number}) {
 const ceiling=Math.max(200,budget*1.2,(cost??0)*1.1),reference=budget/ceiling*100;
 return <div className="tp-target">
  <div className="tp-target-heading"><span>已知费用</span><strong data-testid="hero-total" data-value={cost??'unknown'}>{format(cost,'cost')}</strong></div>
  <div className="tp-target-track" aria-hidden="true">
   {cost!==null&&<i style={{width:`${cost/ceiling*100}%`}}/>}
   {budget>0&&<span className="tp-target-marker" style={{left:`${reference}%`}}><span>参考值</span></span>}
  </div>
  <div className="tp-target-axis"><span>$0</span><span>{format(ceiling,'cost')}</span></div>
 </div>;
}
export function BudgetStudies(props:StudyProps) {
 const {view,variant,budget,onBudget,selected,onSelect}=props,cost=view.total.cost;
 const incomplete=!view.costComplete||view.partial,ratio=budget>0&&cost!==null?cost/budget:null;
 const over=cost!==null&&budget>0&&cost>budget;
 const difference=budget===0?'参考值未启用':cost===null?'费用未知，差额未知':over?`${incomplete?'至少':''}超过 ${money(cost-budget)}`:incomplete?'记录不完整，差额未知':`距参考值 ${money(budget-cost)}`;
 return <div className={`tp-budget tp-budget-${variant}`} data-over={over} data-incomplete={incomplete} style={{'--budget-ink':over?'var(--warning)':'var(--accent)'} as CSSProperties}>
  <div className="tp-budget-context"><span>个人参考 · 仅供探索</span><span>{view.length} 天</span></div>
  {variant===2?<>
   <Target cost={cost} budget={budget}/>
   <div className="tp-budget-ruler"><RulerSlider label="拖动标尺，调整个人参考值" value={budget} onValueChange={onBudget} min={0} max={1000} step={1} majorEvery={50} spacing={2} unit="USD" animateReadout={false}/></div>
  </>:<>
   <div className="tp-budget-total"><span className="tp-caption">已知费用{incomplete?' · 仅已知部分':''}</span><strong data-testid="hero-total" data-value={cost??'unknown'}>{format(cost,'cost')}<small>USD</small></strong></div>
   {variant===0?<Needle ratio={ratio}/>:<Battery ratio={ratio} incomplete={incomplete}/>}
  </>}
  <div className="tp-budget-difference" data-testid="budget-difference"><strong>{difference}</strong><span>{budget>0?`参考值 ${money(budget)}`:'设为 0 时暂停比例比较'}</span></div>
  {variant!==2&&<label className="tp-budget-range"><span>调整参考值 <strong>{money(budget)}</strong></span><input aria-label="调整个人参考值" type="range" min={0} max={1000} step={1} value={budget} onChange={event=>onBudget(Number(event.target.value))}/><small><span>$0</span><span>$1,000</span></small></label>}
  <ReferenceInput budget={budget} onBudget={onBudget}/>
  <ReviewFoot>这条参考线由你在此页设定，不读取或修改正式设置，也不是任何套餐额度。更换日期或来源时，参考值不会自动换算。没有预测段，不估算“还能用多久”。</ReviewFoot>
  <SectionTitle aside="只加总已知费用">费用来自哪里</SectionTitle>
  <SourceList view={view} measure="cost" selected={selected} onSelect={onSelect} bars={false}/>
 </div>;
}
