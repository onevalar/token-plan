import {useId,useRef,type CSSProperties,type KeyboardEvent,type PointerEvent} from 'react';
import {Button} from '../components/arc/button/button';
import {DayReadout,SectionTitle} from './StatisticsShared';
import {canCompare,statisticsCopy,valueOf,type StatisticsDay,type StatisticsMeasure,type StatisticsChartProps} from '../statisticsData';
import './statistics-time.css';

const clamp=(value:number,last:number)=>Math.min(last,Math.max(0,value));
const chosenIndex=(props:StatisticsChartProps)=>{
 const found=props.view.days.findIndex(day=>day.date===props.day);
 return found<0?props.view.days.length-1:found;
};
function kindOf(day:StatisticsDay,measure:StatisticsMeasure) {
 if(!day.records)return 'missing';
 if(valueOf(day,measure)===null)return 'unknown';
 if(day.incomplete||measure==='cost'&&day.partial)return 'partial';
 return valueOf(day,measure)===0?'zero':'known';
}
function dayLabel(day:StatisticsDay,measure:StatisticsMeasure,language:string) {
 const {tr,format}=statisticsCopy(language),kind=kindOf(day,measure);
 const date=new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(`${day.date}T12:00:00`));
 if(kind==='missing')return tr('%@: no recorded data; missing is not zero.',date);
 if(kind==='unknown')return tr('%@: cost unknown.',date);
 const value=format(valueOf(day,measure),measure,false),amount=measure==='tokens'?tr('%@ tokens',value):value;
 return kind==='partial'?tr('%@: %@, recorded portion only.',date,amount)
  :kind==='zero'?tr('%@: %@, recorded zero.',date,amount):tr('%@: %@',date,amount);
}
function knownMaximum(days:StatisticsDay[],measure:StatisticsMeasure) {
 const values=days.map(day=>valueOf(day,measure)).filter((value):value is number=>value!==null);
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

// Dense plots have one focus stop. Keyboard selection is synchronous; only a
// fine mouse pointer may select on hover. Touch can select or drag explicitly.
function plotCursor(props:StatisticsChartProps,centred:boolean) {
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
function DateStepper({props,index,go}:{props:StatisticsChartProps;index:number;go:(index:number)=>void}) {
 const {tr}=statisticsCopy(props.language);
 return <div className="tp-time-stepper" role="group" aria-label={tr('Choose a Date')}
  onKeyDown={event=>dateKeys(event,index,props.view.days.length-1,go)}>
  <Button type="button" variant="ghost" size="sm" aria-disabled={index===0} onClick={()=>go(index-1)}>{tr('Previous Day')}</Button>
  <span>{tr('Day %@ of %@',(index+1).toLocaleString(props.language),props.view.days.length.toLocaleString(props.language))}</span>
  <Button type="button" variant="ghost" size="sm" aria-disabled={index===props.view.days.length-1} onClick={()=>go(index+1)}>{tr('Next Day')}</Button>
 </div>;
}
function DailyReading({props,index}:{props:StatisticsChartProps;index:number}) {
 return <div className="tp-time-reading" role="status" aria-live="polite" aria-atomic="true">
  <DayReadout view={props.view} day={props.view.days[index].date} measure={props.measure} language={props.language}/>
 </div>;
}
function DayLegend({measure,language,intensity=true}:{measure:StatisticsMeasure;language:string;intensity?:boolean}) {
 const {tr}=statisticsCopy(language);
 return <div className="tp-time-day-legend">
  <span><i className="tp-time-gap-key" aria-hidden="true"/>{tr('Missing')}</span><span><i className="tp-time-zero-key" aria-hidden="true"/>{tr('Recorded Zero')}</span>
  {measure==='cost'&&<span><b aria-hidden="true">?</b>{tr('Cost Unknown')}</span>}
  <span><b aria-hidden="true">+</b>{tr('Recorded Portion Only')}</span>
  {intensity&&<span className="tp-time-intensity">{tr('Low')}<i/><i/><i/>{tr('High')}</span>}
 </div>;
}

function Calendar(props:StatisticsChartProps) {
 const {view,measure,onDay,language}=props,index=chosenIndex(props),grid=useRef<HTMLDivElement>(null),id=useId();
 const {tr,shortDate}=statisticsCopy(language),first=view.days[0],last=view.days.at(-1)!;
 const firstDate=new Date(`${first.date}T12:00:00`),lastDate=new Date(`${last.date}T12:00:00`);
 const lead=(firstDate.getDay()+6)%7,weeks=Math.ceil((lead+view.days.length)/7),maximum=knownMaximum(view.days,measure);
 const monthFormat=new Intl.DateTimeFormat(language,{month:'long',year:'numeric'});
 const month=first.date.slice(0,7)===last.date.slice(0,7)?monthFormat.format(firstDate):monthFormat.formatRange(firstDate,lastDate);
 const weekdays=Array.from({length:7},(_,index)=>new Date(2024,0,1+index)); // Monday first.
 const peak=maximum!==null&&maximum>0?view.days.findIndex(day=>valueOf(day,measure)===maximum):-1;
 const select=(at:number)=>{
  onDay(view.days[at].date);
  grid.current?.querySelector<HTMLButtonElement>(`[data-date="${view.days[at].date}"]`)?.focus();
 };
 return <section className="tp-time tp-time-calendar" aria-label={tr('Pulse Calendar')}>
  <div className="tp-time-calendar-layout">
   <div className="tp-time-calendar-detail"><DailyReading props={props} index={index}/></div>
   <div className="tp-time-calendar-sheet">
    <SectionTitle aside={<Button type="button" variant="ghost" size="sm" disabled={peak<0} onClick={()=>select(peak)}>{tr('Find Peak')}</Button>}>{month}</SectionTitle>
    <div ref={grid} role="grid" aria-label={tr('Daily Usage, Monday to Sunday')} aria-describedby={id} className="tp-time-calendar-grid"
     onKeyDown={event=>dateKeys(event,index,view.days.length-1,select,7)}>
     <div role="row" className="tp-time-calendar-weekdays">{weekdays.map((date,at)=><span key={at} role="columnheader" aria-label={date.toLocaleDateString(language,{weekday:'long'})}>{date.toLocaleDateString(language,{weekday:'short'})}</span>)}</div>
     {Array.from({length:weeks},(_,week)=><div key={week} role="row" className="tp-time-calendar-week">
      {Array.from({length:7},(_,column)=>{
       const at=week*7+column-lead,day=view.days[at];
       if(!day)return <span key={column} role="gridcell" aria-label={tr('Outside the Selected Period')} className="tp-time-calendar-blank"/>;
       const value=valueOf(day,measure),kind=kindOf(day,measure);
       const strength=value!==null&&maximum!==null&&maximum>0?8+value/maximum*24:0;
       return <div key={column} role="gridcell" aria-selected={at===index}>
        <button type="button" className="tp-time-date" data-date={day.date} data-kind={kind} data-selected={at===index}
         tabIndex={at===index?0:-1} aria-label={dayLabel(day,measure,language)} aria-pressed={at===index}
         style={{'--time-strength':`${strength}%`,'--time-level':value!==null&&maximum?Math.max(.18,value/maximum):0} as CSSProperties}
         onClick={()=>onDay(day.date)} onFocus={()=>onDay(day.date)}>
         <span>{day.date.slice(8)==='01'||at===0?shortDate(day.date):Number(day.date.slice(8)).toLocaleString(language)}</span>
         <span className="tp-time-date-mark" aria-hidden="true">{kind==='missing'?'—':kind==='unknown'?'?':kind==='zero'?'○':kind==='partial'?'+':<i/>}</span>
        </button>
       </div>;
      })}
     </div>)}
    </div>
    <DayLegend measure={measure} language={language}/>
   </div>
  </div>
  <p id={id} className="tp-chart-note">{tr('Left/Right: one day. Up/Down: one week. Blank cells are outside the period; dashed cells have no records.')} {tr(measure==='cost'
   ?'Intensity uses known costs. Dates marked + do not represent a complete bill.'
   :'Intensity is relative to the highest recorded day. Dates marked + contain only part of the usage; select a day for its exact value.')}</p>
 </section>;
}

function Pixels(props:StatisticsChartProps) {
 const {view,measure,language}=props,cursor=plotCursor(props,true),maximum=knownMaximum(view.days,measure),id=useId();
 const {tr,format,shortDate}=statisticsCopy(language),selected=view.days[cursor.index];
 const partial=view.partial||measure==='cost'&&!view.costComplete;
 const peak=measure==='tokens'?tr('%@ tokens',format(maximum,measure)):format(maximum,measure);
 return <section className="tp-time tp-time-pixels" aria-label={tr('Pixel Levels')}>
  <div className="tp-time-meter">
   <SectionTitle aside={tr(partial?'Recorded Peak %@':'Peak %@',peak)}>{tr('Daily Levels')}</SectionTitle>
   <DailyReading props={props} index={cursor.index}/>
   <div className="tp-time-equalizer" role="slider" tabIndex={0} aria-label={tr('Choose a Daily Level')} aria-orientation="horizontal"
    aria-valuemin={1} aria-valuemax={view.days.length} aria-valuenow={cursor.index+1} aria-valuetext={dayLabel(selected,measure,language)}
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
   <DayLegend measure={measure} language={language} intensity={false}/>
   <DateStepper props={props} index={cursor.index} go={cursor.go}/>
  </div>
  <p id={id} className="tp-chart-note">{tr('One column per day, %@ in total. Move the pointer or use arrow keys to select a day. The 12 cells show relative intensity, rounded up, not a live rate.',view.days.length.toLocaleString(language))}</p>
 </section>;
}

type Cumulative={date:string;total:number|null;point:number|null;lower:boolean};
function accumulate(days:StatisticsDay[],measure:StatisticsMeasure,incomplete:boolean):Cumulative[] {
 let total:number|null=null,lower=incomplete;
 return days.map(day=>{
  const value=valueOf(day,measure);
  if(value===null)lower=true;
  else total=total===null?value:total+value;
  if(day.incomplete||measure==='cost'&&day.partial)lower=true;
  // A missing observation breaks the path. Later known observations add to a
  // lower bound, never to a zero-filled or interpolated complete trajectory.
  return {date:day.date,total,point:value===null?null:total,lower};
 });
}
function cumulativeLabel(sample:Cumulative,measure:StatisticsMeasure,language:string,short=true) {
 const {tr,format}=statisticsCopy(language),amount=format(sample.total,measure,sample.lower?false:short);
 return sample.total!==null&&sample.lower?tr('At least %@',amount):amount;
}
function trajectoryPath(samples:Cumulative[],x:(index:number)=>number,y:(value:number)=>number) {
 return samples.map((sample,index)=>sample.point===null?'':
  `${index===0||samples[index-1].point===null?'M':'L'}${x(index)},${y(sample.point)}`).filter(Boolean).join(' ');
}

function Trajectory(props:StatisticsChartProps) {
 const {view,measure,language}=props,cursor=plotCursor(props,false),id=useId(),{tr,format,shortDate,unit}=statisticsCopy(language);
 const current=accumulate(view.days,measure,view.partial),prior=accumulate(view.previousDays,measure,view.previousPartial);
 const values=[...current,...prior].map(sample=>sample.point).filter((value):value is number=>value!==null);
 const maximum=values.length?Math.max(...values):null,scale=maximum!==null&&maximum>0?maximum:1;
 const x=(at:number)=>view.days.length===1?150:at/(view.days.length-1)*300,y=(value:number)=>174-value/scale*160;
 const reading=current[cursor.index],before=prior[cursor.index],comparable=canCompare(view,measure);
 const bands=current.map((sample,at)=>sample.point===null?at:-1).filter(at=>at>=0);
 return <section className="tp-time tp-time-trajectory" aria-label={tr('Cumulative Trajectory')}>
  <SectionTitle aside={tr('Same Scale · %@-Day Periods',view.days.length.toLocaleString(language))}>{tr('Recorded Cumulative Path')}</SectionTitle>
  <div className="tp-time-series-legend tp-time-cumulative" role="status" aria-live="polite" aria-atomic="true">
   {[reading,before].map((sample,at)=>{
    const bounds=at===0?view.bounds:view.priorBounds;
    return <div key={at} data-period={at===0?'current':'previous'} data-lower-bound={sample.lower}>
     <span><i className={at===1?'tp-time-prior-key':undefined} aria-hidden="true"/>{tr(at===0?'Current Period':'Previous Period')}<small>{unit(measure)}</small></span>
     <small>{tr('%@ to %@',shortDate(bounds.start),shortDate(bounds.end))}</small>
     <strong>{cumulativeLabel(sample,measure,language)}</strong>
     <small>{tr('Through %@ · %@',shortDate(sample.date),tr(sample.total===null?'Cumulative Unknown':sample.lower?'Known Lower Bound':'Recorded Cumulative Total'))}</small>
    </div>;
   })}
  </div>
  <div className="tp-time-trajectory-chart">
   <div className="tp-time-y-axis" aria-hidden="true"><span>{maximum!==null&&maximum>0?format(maximum,measure):''}</span><span>{maximum!==null&&maximum>0?format(maximum/2,measure):''}</span><span>{maximum===null?'—':(0).toLocaleString(language)}</span></div>
   <div className="tp-time-trajectory-plot" role="slider" tabIndex={0} aria-label={tr('Choose a Cumulative Date')} aria-orientation="horizontal"
    aria-valuemin={1} aria-valuemax={view.days.length} aria-valuenow={cursor.index+1}
    aria-valuetext={tr('%@. Current cumulative: %@; previous period, day %@: %@.',dayLabel(view.days[cursor.index],measure,language),cumulativeLabel(reading,measure,language,false),(cursor.index+1).toLocaleString(language),cumulativeLabel(before,measure,language,false))}
    aria-describedby={`${id}-note`} {...cursor.events}>
    <svg viewBox="0 0 300 184" preserveAspectRatio="none" aria-hidden="true" focusable="false">
     <defs><pattern id={`${id}-gap`} patternUnits="userSpaceOnUse" width="6" height="6"><path d="M-1,1L1,-1M0,6L6,0M5,7L7,5" className="tp-time-hatch"/></pattern></defs>
     {[14,94,174].map(height=><line key={height} x1="0" x2="300" y1={height} y2={height} className="tp-time-gridline"/>)}
     {bands.map(at=>{
      const width=view.days.length===1?300:300/(view.days.length-1),left=Math.max(0,x(at)-width/2),right=Math.min(300,x(at)+width/2);
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
    {maximum===null&&<p className="tp-time-no-trajectory">{tr(measure==='cost'?'Cost Unknown':'No Recorded Data')}<small>{tr('No invented curve is drawn.')}</small></p>}
   </div>
   <div className="tp-time-axis" aria-hidden="true"><span>{tr('Day %@',(1).toLocaleString(language))}</span>{view.days.length>1&&<span>{tr('Day %@',view.days.length.toLocaleString(language))}</span>}</div>
  </div>
  <div className="tp-time-trajectory-reading"><DailyReading props={props} index={cursor.index}/></div>
  <DateStepper props={props} index={cursor.index} go={cursor.go}/>
  <p id={`${id}-note`} className="tp-chart-note">{tr(comparable?'Periods align by day number and compare recorded values only.'
   :'Incomplete records. No increase or decrease is inferred; incomplete cumulative values are known lower bounds.')} {tr('Gaps break the line. Later points add only known values; no zero filling or forecasts.')}</p>
 </section>;
}

export function StatisticsTime(props:StatisticsChartProps) {
 if(props.variant===0)return <Calendar {...props}/>;
 if(props.variant===1)return <Pixels {...props}/>;
 return <Trajectory {...props}/>;
}
