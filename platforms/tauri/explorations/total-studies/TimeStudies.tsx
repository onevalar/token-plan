import {useId,useRef,type CSSProperties,type KeyboardEvent,type PointerEvent} from 'react';
import {Button} from '../../src/components/arc/button/button';
import {DayReadout,Hero,SectionTitle} from './Shared';
import {canCompare,format,shortDate,valueOf,type Day,type Measure,type StudyProps} from './data';
import './time-studies.css';

const weekdays=['一','二','三','四','五','六','日'];
const clamp=(value:number,last:number)=>Math.min(last,Math.max(0,value));
const chosenIndex=(props:StudyProps)=>{
 const found=props.view.days.findIndex(d=>d.date===props.day);
 return found<0?props.view.days.length-1:found;
};
function kindOf(day:Day,measure:Measure) {
 if(!day.records)return 'missing';
 if(valueOf(day,measure)===null)return 'unknown';
 if(measure==='cost'&&day.partial)return 'partial';
 return valueOf(day,measure)===0?'zero':'known';
}
function dayLabel(day:Day,measure:Measure) {
 const kind=kindOf(day,measure),value=valueOf(day,measure);
 return `${day.date}，${kind==='missing'?'没有记录，不能当作零':kind==='unknown'?'费用未知':
  `${format(value,measure,false)}${measure==='tokens'?' tokens':''}${kind==='partial'?'，仅已知部分':kind==='zero'?'，真实零值':''}`}`;
}
function knownMaximum(days:Day[],measure:Measure) {
 const values=days.map(d=>valueOf(d,measure)).filter((v):v is number=>v!==null);
 return values.length?Math.max(...values):null;
}
function dateKeys(event:KeyboardEvent<HTMLElement>,index:number,last:number,select:(index:number)=>void,vertical=-1) {
 const next:Record<string,number>={ArrowLeft:index-1,ArrowRight:index+1,ArrowUp:index-vertical,
  ArrowDown:index+vertical,Home:0,End:last,PageUp:index-7,PageDown:index+7};
 if(!(event.key in next))return;
 event.preventDefault();
 event.stopPropagation();
 select(clamp(next[event.key],last));
}

// One focus stop for dense plots; native buttons remain available for touch and
// step-by-step selection. Hover selection is never enabled for coarse pointers.
function plotCursor(props:StudyProps,centred:boolean) {
 const {view,onDay}=props,index=chosenIndex(props);
 const go=(at:number)=>onDay(view.days[clamp(at,view.days.length-1)].date);
 const point=(event:PointerEvent<HTMLDivElement>)=>{
  const bounds=event.currentTarget.getBoundingClientRect();
  const fraction=(event.clientX-bounds.left)/bounds.width;
  go(centred?Math.floor(fraction*view.days.length):Math.round(fraction*(view.days.length-1)));
 };
 return {index,go,events:{
  onKeyDown:(event:KeyboardEvent<HTMLElement>)=>dateKeys(event,index,view.days.length-1,go),
  onPointerDown:(event:PointerEvent<HTMLDivElement>)=>{
   if(event.button!==0)return;
   event.currentTarget.focus({preventScroll:true});
   if(event.pointerType!=='mouse')event.currentTarget.setPointerCapture(event.pointerId);
   point(event);
  },
  onPointerMove:(event:PointerEvent<HTMLDivElement>)=>{
   if(event.buttons&1||event.pointerType==='mouse'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches)point(event);
  },
 }};
}
function DateStepper({props,index,go}:{props:StudyProps;index:number;go:(index:number)=>void}) {
 return <div className="tp-time-stepper" role="group" aria-label="选择日期"
  onKeyDown={event=>dateKeys(event,index,props.view.days.length-1,go)}>
  <Button type="button" variant="ghost" size="sm" aria-disabled={index===0} onClick={()=>go(index-1)}>前一天</Button>
  <span>{index+1}<span> / {props.view.days.length} 天</span></span>
  <Button type="button" variant="ghost" size="sm" aria-disabled={index===props.view.days.length-1} onClick={()=>go(index+1)}>后一天</Button>
 </div>;
}
function DailyReading({props,index}:{props:StudyProps;index:number}) {
 return <div className="tp-time-reading" role="status" aria-live="polite" aria-atomic="true">
  <DayReadout view={props.view} day={props.view.days[index].date} measure={props.measure}/>
 </div>;
}
function DayLegend({measure,intensity=true}:{measure:Measure;intensity?:boolean}) {
 return <div className="tp-time-day-legend">
  <span><i className="tp-time-gap-key"/>缺失</span><span><i className="tp-time-zero-key"/>真零</span>
  {measure==='cost'&&<><span><b>?</b>费用未知</span><span><b>+</b>已知部分</span></>}
  {intensity&&<span className="tp-time-intensity">低<i/><i/><i/>高</span>}
 </div>;
}

function CalendarStudy(props:StudyProps) {
 const {view,measure,onDay}=props,index=chosenIndex(props),grid=useRef<HTMLDivElement>(null),id=useId();
 const first=view.days[0],last=view.days.at(-1)!;
 const lead=(new Date(`${first.date}T12:00:00`).getDay()+6)%7;
 const weeks=Math.ceil((lead+view.days.length)/7),maximum=knownMaximum(view.days,measure);
 const firstMonth=Number(first.date.slice(5,7)),lastMonth=Number(last.date.slice(5,7));
 const month=first.date.slice(0,4)===last.date.slice(0,4)?
  `${first.date.slice(0,4)} 年 ${firstMonth===lastMonth?lastMonth:`${firstMonth}–${lastMonth}`} 月`:
  `${first.date.slice(0,7)} – ${last.date.slice(0,7)}`;
 const peak=maximum!==null&&maximum>0?view.days.findIndex(d=>valueOf(d,measure)===maximum):-1;
 const select=(at:number)=>{
  onDay(view.days[at].date);
  grid.current?.querySelector<HTMLButtonElement>(`[data-date="${view.days[at].date}"]`)?.focus();
 };
 return <section className="tp-time tp-time-calendar" aria-label="脉冲日历">
  <Hero view={view} measure={measure} small/>
  <div className="tp-time-calendar-layout">
   <div className="tp-time-calendar-detail"><DailyReading props={props} index={index}/></div>
   <div className="tp-time-calendar-sheet">
    <SectionTitle aside={<Button type="button" variant="ghost" size="sm" disabled={peak<0} onClick={()=>select(peak)}>定位峰值</Button>}>{month}</SectionTitle>
    <div ref={grid} role="grid" aria-label="每日用量，周一至周日" aria-describedby={id} className="tp-time-calendar-grid"
     onKeyDown={event=>dateKeys(event,index,view.days.length-1,select,7)}>
     <div role="row" className="tp-time-calendar-weekdays">{weekdays.map(d=><span key={d} role="columnheader" aria-label={`星期${d}`}>{d}</span>)}</div>
     {Array.from({length:weeks},(_,week)=><div key={week} role="row" className="tp-time-calendar-week">
      {Array.from({length:7},(_,column)=>{
       const at=week*7+column-lead,day=view.days[at];
       if(!day)return <span key={column} role="gridcell" aria-label="范围外" className="tp-time-calendar-blank"/>;
       const value=valueOf(day,measure),kind=kindOf(day,measure);
       const strength=value!==null&&maximum!==null&&maximum>0?8+value/maximum*24:0;
       return <div key={column} role="gridcell" aria-selected={at===index}>
        <button type="button" className="tp-time-date" data-date={day.date} data-kind={kind} data-selected={at===index}
         tabIndex={at===index?0:-1} aria-label={dayLabel(day,measure)} aria-pressed={at===index}
         style={{'--time-strength':`${strength}%`,'--time-level':value!==null&&maximum?Math.max(.18,value/maximum):0} as CSSProperties}
         onClick={()=>onDay(day.date)} onFocus={()=>onDay(day.date)}>
         <span>{day.date.slice(8)==='01'||at===0?shortDate(day.date):Number(day.date.slice(8))}</span>
         <span className="tp-time-date-mark" aria-hidden="true">{kind==='missing'?'—':kind==='unknown'?'?':kind==='zero'?'○':kind==='partial'?'+':<i/>}</span>
        </button>
       </div>;
      })}
     </div>)}
    </div>
    <DayLegend measure={measure}/>
   </div>
  </div>
  <p id={id} className="tp-chart-note">← → 逐日 · ↑ ↓ 跨周。空白格在范围外，虚线格才是缺失。{measure==='cost'?'色阶按已知费用绘制；带 + 的日期不是完整账单。':'色阶相对本期最高日用量，精确数字以选中读数为准。'}</p>
 </section>;
}

function PixelStudy(props:StudyProps) {
 const {view,measure}=props,cursor=plotCursor(props,true),maximum=knownMaximum(view.days,measure),id=useId();
 const selected=view.days[cursor.index],partial=measure==='cost'&&!view.costComplete;
 return <section className="tp-time tp-time-pixels" aria-label="像素电平">
  <Hero view={view} measure={measure} small/>
  <div className="tp-time-meter">
   <SectionTitle aside={`${partial?'已知':''}峰值 ${format(maximum,measure)}${measure==='tokens'?' tokens':''}`}>每日电平</SectionTitle>
   <DailyReading props={props} index={cursor.index}/>
   <div className="tp-time-equalizer" role="slider" tabIndex={0} aria-label="选择电平日期" aria-orientation="horizontal"
    aria-valuemin={1} aria-valuemax={view.days.length} aria-valuenow={cursor.index+1} aria-valuetext={dayLabel(selected,measure)}
    aria-describedby={id} {...cursor.events}>
    <div className="tp-time-pixel-columns" style={{'--time-days':view.days.length} as CSSProperties} aria-hidden="true">
     {view.days.map((day,at)=>{
      const value=valueOf(day,measure),kind=kindOf(day,measure);
      const lit=value!==null&&maximum!==null&&maximum>0?Math.ceil(value/maximum*12):0;
      return <div className="tp-time-pixel-column" key={day.date} data-kind={kind} data-selected={at===cursor.index} data-date={day.date}>
       <span className="tp-time-pixel-caret"/>
       <span className="tp-time-pixel-stack">{Array.from({length:12},(_,cell)=><i key={cell} data-lit={cell<lit}/>)}</span>
       <span className="tp-time-pixel-status">{kind==='missing'?'—':kind==='unknown'?'?':kind==='zero'?'○':kind==='partial'?'+':''}</span>
      </div>;
     })}
    </div>
   </div>
   <div className="tp-time-axis" aria-hidden="true"><span>{shortDate(view.days[0].date)}</span>{view.days.length>1&&<><span>{shortDate(view.days[Math.floor((view.days.length-1)/2)].date)}</span><span>{shortDate(view.days.at(-1)!.date)}</span></>}</div>
   <DayLegend measure={measure} intensity={false}/>
   <DateStepper props={props} index={cursor.index} go={cursor.go}/>
  </div>
  <p id={id} className="tp-chart-note">每列一天，共 {view.days.length} 天。移动指针或用方向键选日。12 格是相对强度，向上取整；不是实时速率。</p>
 </section>;
}

type Cumulative={date:string;total:number|null;point:number|null;lower:boolean};
function accumulate(days:Day[],measure:Measure,incomplete=false):Cumulative[] {
 let total:number|null=null,lower=incomplete;
 return days.map(day=>{
  const value=valueOf(day,measure);
  if(value===null)lower=true;
  else total=total===null?value:total+value;
  if(measure==='cost'&&day.partial)lower=true;
  // Keep a gap in the line, even when an earlier known subtotal is available.
  // Resumed points are lower bounds, never a zero-filled complete trajectory.
  return {date:day.date,total,point:value===null?null:total,lower};
 });
}
const cumulativeLabel=(sample:Cumulative,measure:Measure,short=true)=>
 `${sample.total!==null&&sample.lower?'至少 ':''}${format(sample.total,measure,sample.lower?false:short)}`;
function trajectoryPath(samples:Cumulative[],x:(index:number)=>number,y:(value:number)=>number) {
 return samples.map((sample,index)=>sample.point===null?'':
  `${index===0||samples[index-1].point===null?'M':'L'}${x(index)},${y(sample.point)}`).join(' ');
}

function TrajectoryStudy(props:StudyProps) {
 const {view,measure}=props,cursor=plotCursor(props,false),id=useId();
 const current=accumulate(view.days,measure,view.partial);
 const prior=accumulate(view.previousDays,measure);
 const values=[...current,...prior].map(s=>s.point).filter((v):v is number=>v!==null);
 const maximum=values.length?Math.max(...values):null,scale=maximum!==null&&maximum>0?maximum:1;
 const x=(at:number)=>view.days.length===1?150:at/(view.days.length-1)*300;
 const y=(value:number)=>174-value/scale*160;
 const reading=current[cursor.index],before=prior[cursor.index],comparable=canCompare(view,measure);
 const bands=current.map((sample,at)=>sample.point===null?at:-1).filter(at=>at>=0);
 return <section className="tp-time tp-time-trajectory" aria-label="累积轨迹">
  <Hero view={view} measure={measure} small/>
  <SectionTitle aside={`同一刻度 · 等长 ${view.days.length} 天`}>记录的累积路径</SectionTitle>
  <div className="tp-time-series-legend tp-time-cumulative" role="status" aria-live="polite" aria-atomic="true">
   {[reading,before].map((sample,at)=>{
    const bounds=at===0?view.bounds:view.priorBounds;
    return <div key={at}>
     <span><i className={at===1?'tp-time-prior-key':undefined}/>{at===0?'本期':'前期'}<small>{measure==='tokens'?'tokens':'USD'}</small></span>
     <small>{shortDate(bounds.start)} 至 {shortDate(bounds.end)}</small>
     <strong>{cumulativeLabel(sample,measure)}</strong>
     <small>至 {shortDate(sample.date)} · {sample.total===null?'累计未知':sample.lower?'已知下界':'已记录累计'}</small>
    </div>;
   })}
  </div>
  <div className="tp-time-trajectory-chart">
   <div className="tp-time-y-axis" aria-hidden="true"><span>{maximum!==null&&maximum>0?format(maximum,measure):''}</span><span>{maximum!==null&&maximum>1?format(maximum/2,measure):''}</span><span>{maximum===null?'—':'0'}</span></div>
   <div className="tp-time-trajectory-plot" role="slider" tabIndex={0} aria-label="选择累积日期" aria-orientation="horizontal"
    aria-valuemin={1} aria-valuemax={view.days.length} aria-valuenow={cursor.index+1}
    aria-valuetext={`${dayLabel(view.days[cursor.index],measure)}。本期累计${cumulativeLabel(reading,measure,false)}；前期第 ${cursor.index+1} 天累计${cumulativeLabel(before,measure,false)}`}
    aria-describedby={`${id}-note`} {...cursor.events}>
    <svg viewBox="0 0 300 184" preserveAspectRatio="none" aria-hidden="true" focusable="false">
     <defs><pattern id={`${id}-gap`} patternUnits="userSpaceOnUse" width="6" height="6"><path d="M-1,1L1,-1M0,6L6,0M5,7L7,5" className="tp-time-hatch"/></pattern></defs>
     {[14,94,174].map(height=><line key={height} x1="0" x2="300" y1={height} y2={height} className="tp-time-gridline"/>)}
     {bands.map(at=>{
      const width=view.days.length===1?300:300/(view.days.length-1);
      const left=Math.max(0,x(at)-width/2),right=Math.min(300,x(at)+width/2);
      return <rect key={at} x={left} y="10" width={right-left} height="168" fill={`url(#${id}-gap)`}/>;
     })}
     <line x1={x(cursor.index)} x2={x(cursor.index)} y1="8" y2="180" className="tp-time-crosshair"/>
     {[prior,current].map((samples,series)=><g key={series} className={series===0?'tp-time-line-prior':'tp-time-line-current'}>
      <path d={trajectoryPath(samples,x,y)} className="tp-time-line" vectorEffect="non-scaling-stroke"/>
     </g>)}
    </svg>
    {[prior,current].map((samples,series)=>samples.map((sample,at)=>sample.point!==null&&(at===cursor.index||
     (at===0||samples[at-1].point===null)&&(at===samples.length-1||samples[at+1].point===null))?
     <span key={`${series}-${at}`} className="tp-time-plot-dot" aria-hidden="true" data-prior={series===0} data-selected={at===cursor.index}
      style={{left:`${x(at)/3}%`,top:`${y(sample.point)/184*100}%`}}/>:null))}
    {maximum===null&&<p className="tp-time-no-trajectory">{measure==='cost'?'费用未知':'没有记录'}<small>不绘制虚构曲线</small></p>}
   </div>
   <div className="tp-time-axis" aria-hidden="true"><span>第 1 天</span>{view.days.length>1&&<span>第 {view.days.length} 天</span>}</div>
  </div>
  <div className="tp-time-trajectory-reading">
   <DailyReading props={props} index={cursor.index}/>
  </div>
  <DateStepper props={props} index={cursor.index} go={cursor.go}/>
  <p id={`${id}-note`} className="tp-chart-note">{comparable?'两期按第几天对齐，只比较已有记录。':
   '记录不完整，不判断增减；累计只代表已知下界。'}缺失处断线，后续只加已知值；不补零、不预测。</p>
 </section>;
}

export function TimeStudies(props:StudyProps) {
 if(props.variant===0)return <CalendarStudy {...props}/>;
 if(props.variant===1)return <PixelStudy {...props}/>;
 return <TrajectoryStudy {...props}/>;
}
