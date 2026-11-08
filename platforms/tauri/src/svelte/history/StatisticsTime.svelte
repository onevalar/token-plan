<script lang="ts">
 import {tick} from 'svelte';
 import {Button} from '@valar/svelte-ui/button';
 import StatisticsSummary from './StatisticsSummary.svelte';
 import SectionTitle from './SectionTitle.svelte';
 import {canCompare,statisticsCopy,valueOf,type StatisticsDay,type StatisticsChartProps} from '../../statisticsData';
 import '../../preview/statistics-time.css';
 let {view,measure,onDay,day,language,variant}:StatisticsChartProps=$props();
 const id=$props.id();let grid=$state<HTMLDivElement>();
 const copy=$derived(statisticsCopy(language));
 const index=$derived.by(()=>{const found=view.days.findIndex(item=>item.date===day);return found<0?view.days.length-1:found;});
 const clamp=(value:number)=>Math.min(view.days.length-1,Math.max(0,value));
 function go(at:number){onDay(view.days[clamp(at)].date);}
 async function select(at:number){go(at);await tick();grid?.querySelector<HTMLButtonElement>(`[data-date="${view.days[clamp(at)].date}"]`)?.focus();}
 function kindOf(item:StatisticsDay){if(!item.records)return 'missing';if(valueOf(item,measure)===null)return 'unknown';if(item.incomplete||measure==='cost'&&item.partial)return 'partial';return valueOf(item,measure)===0?'zero':'known';}
 function dayLabel(item:StatisticsDay){
  const kind=kindOf(item),date=new Intl.DateTimeFormat(language,{dateStyle:'medium'}).format(new Date(`${item.date}T12:00:00`));
  if(kind==='missing')return copy.tr('%@: no recorded data; missing is not zero.',date);if(kind==='unknown')return copy.tr('%@: cost unknown.',date);
  const value=copy.format(valueOf(item,measure),measure,false),amount=measure==='tokens'?copy.tr('%@ tokens',value):value;
  return kind==='partial'?copy.tr('%@: %@, recorded portion only.',date,amount):kind==='zero'?copy.tr('%@: %@, recorded zero.',date,amount):copy.tr('%@: %@',date,amount);
 }
 function knownMaximum(days:StatisticsDay[]){const values=days.map(item=>valueOf(item,measure)).filter((value):value is number=>value!==null);return values.length?Math.max(...values):null;}
 function dateKeys(event:KeyboardEvent,calendar=false){
  const vertical=calendar?7:-1,next:Record<string,number>={ArrowLeft:index-1,ArrowRight:index+1,ArrowUp:index-vertical,ArrowDown:index+vertical,Home:0,End:view.days.length-1,PageUp:index-7,PageDown:index+7};
  if(!(event.key in next))return;event.preventDefault();event.stopPropagation();if(calendar)void select(clamp(next[event.key]));else go(next[event.key]);
 }
 type PlotPointer=PointerEvent&{currentTarget:EventTarget&HTMLDivElement};
 function point(event:PlotPointer){const bounds=event.currentTarget.getBoundingClientRect(),fraction=(event.clientX-bounds.left)/bounds.width;go(variant===1?Math.floor(fraction*view.days.length):Math.round(fraction*(view.days.length-1)));}
 function pointerDown(event:PlotPointer){if(event.button!==0)return;event.currentTarget.focus({preventScroll:true});if(event.pointerType!=='mouse')event.currentTarget.setPointerCapture(event.pointerId);point(event);}
 function pointerMove(event:PlotPointer){if(event.buttons&1||event.pointerType==='mouse'&&window.matchMedia('(hover: hover) and (pointer: fine)').matches)point(event);}
 const maximum=$derived(knownMaximum(view.days));
 const first=$derived(view.days[0]),last=$derived(view.days.at(-1)!);
 const firstDate=$derived(new Date(`${first.date}T12:00:00`)),lastDate=$derived(new Date(`${last.date}T12:00:00`));
 const lead=$derived((firstDate.getDay()+6)%7),weeks=$derived(Math.ceil((lead+view.days.length)/7));
 const month=$derived.by(()=>{const format=new Intl.DateTimeFormat(language,{month:'long',year:'numeric'});return first.date.slice(0,7)===last.date.slice(0,7)?format.format(firstDate):format.formatRange(firstDate,lastDate);});
 const weekdays=Array.from({length:7},(_,at)=>new Date(2024,0,1+at));
 const peak=$derived(maximum!==null&&maximum>0?view.days.findIndex(item=>valueOf(item,measure)===maximum):-1);
 const partial=$derived(view.partial||measure==='cost'&&!view.costComplete);
 type Cumulative={date:string;total:number|null;point:number|null;lower:boolean};
 function accumulate(days:StatisticsDay[],incomplete:boolean):Cumulative[]{let total:number|null=null,lower=incomplete;return days.map(item=>{const value=valueOf(item,measure);if(value===null)lower=true;else total=total===null?value:total+value;if(item.incomplete||measure==='cost'&&item.partial)lower=true;return {date:item.date,total,point:value===null?null:total,lower};});}
 const current=$derived(accumulate(view.days,view.partial)),prior=$derived(accumulate(view.previousDays,view.previousPartial));
 const cumulativeMax=$derived.by(()=>{const values=[...current,...prior].map(sample=>sample.point).filter((value):value is number=>value!==null);return values.length?Math.max(...values):null;});
 const scale=$derived(cumulativeMax!==null&&cumulativeMax>0?cumulativeMax:1);
 const x=(at:number)=>view.days.length===1?150:at/(view.days.length-1)*300,y=(value:number)=>174-value/scale*160;
 const reading=$derived(current[index]),before=$derived(prior[index]),comparable=$derived(canCompare(view,measure));
 const bands=$derived(current.map((sample,at)=>sample.point===null?at:-1).filter(at=>at>=0));
 function cumulativeLabel(sample:Cumulative,short=true){const amount=copy.format(sample.total,measure,sample.lower?false:short);return sample.total!==null&&sample.lower?copy.tr('At least %@',amount):amount;}
 function trajectoryPath(samples:Cumulative[]){return samples.map((sample,at)=>sample.point===null?'':`${at===0||samples[at-1].point===null?'M':'L'}${x(at)},${y(sample.point)}`).filter(Boolean).join(' ');}
</script>
{#snippet dailyReading()}
 <div class="tp-time-reading" role="status" aria-live="polite" aria-atomic="true"><StatisticsSummary kind="day" {view} day={view.days[index].date} {measure} {language}/></div>
{/snippet}
{#snippet stepper()}
 <!-- Arrow-key handling is delegated from the two native buttons. -->
 <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
 <div class="tp-time-stepper" role="group" aria-label={copy.tr('Choose a Date')} onkeydown={event=>dateKeys(event)}><Button type="button" variant="ghost" size="sm" aria-disabled={index===0} onclick={()=>go(index-1)}>{copy.tr('Previous Day')}</Button><span>{copy.tr('Day %@ of %@',(index+1).toLocaleString(language),view.days.length.toLocaleString(language))}</span><Button type="button" variant="ghost" size="sm" aria-disabled={index===view.days.length-1} onclick={()=>go(index+1)}>{copy.tr('Next Day')}</Button></div>
{/snippet}
{#snippet dayLegend(intensity=true)}
 <div class="tp-time-day-legend"><span><i class="tp-time-gap-key" aria-hidden="true"></i>{copy.tr('Missing')}</span><span><i class="tp-time-zero-key" aria-hidden="true"></i>{copy.tr('Recorded Zero')}</span>{#if measure==='cost'}<span><b aria-hidden="true">?</b>{copy.tr('Cost Unknown')}</span>{/if}<span><b aria-hidden="true">+</b>{copy.tr('Recorded Portion Only')}</span>{#if intensity}<span class="tp-time-intensity">{copy.tr('Low')}<i></i><i></i><i></i>{copy.tr('High')}</span>{/if}</div>
{/snippet}
{#if variant===0}<section class="tp-time tp-time-calendar" aria-label={copy.tr('Pulse Calendar')}><div class="tp-time-calendar-layout"><div class="tp-time-calendar-detail">{@render dailyReading()}</div><div class="tp-time-calendar-sheet">
 <SectionTitle>{month}{#snippet aside()}<Button type="button" variant="ghost" size="sm" disabled={peak<0} onclick={()=>void select(peak)}>{copy.tr('Find Peak')}</Button>{/snippet}</SectionTitle>
 <div bind:this={grid} role="grid" tabindex={-1} aria-label={copy.tr('Daily Usage, Monday to Sunday')} aria-describedby={id} class="tp-time-calendar-grid" onkeydown={event=>dateKeys(event,true)}>
  <div role="row" class="tp-time-calendar-weekdays">{#each weekdays as date}<span role="columnheader" aria-label={date.toLocaleDateString(language,{weekday:'long'})}>{date.toLocaleDateString(language,{weekday:'short'})}</span>{/each}</div>
  {#each Array.from({length:weeks},(_,i)=>i) as week}<div role="row" class="tp-time-calendar-week">{#each Array.from({length:7},(_,i)=>i) as column}{@const at=week*7+column-lead}{@const item=view.days[at]}
   {#if !item}<span role="gridcell" aria-label={copy.tr('Outside the Selected Period')} class="tp-time-calendar-blank"></span>{:else}{@const value=valueOf(item,measure)}{@const kind=kindOf(item)}{@const strength=value!==null&&maximum!==null&&maximum>0?8+value/maximum*24:0}
    <div role="gridcell" aria-selected={at===index}><button type="button" class="tp-time-date" data-date={item.date} data-kind={kind} data-selected={at===index} tabindex={at===index?0:-1} aria-label={dayLabel(item)} aria-pressed={at===index} style={`--time-strength:${strength}%;--time-level:${value!==null&&maximum?Math.max(.18,value/maximum):0}`} onclick={()=>onDay(item.date)} onfocus={()=>onDay(item.date)}><span>{item.date.slice(8)==='01'||at===0?copy.shortDate(item.date):Number(item.date.slice(8)).toLocaleString(language)}</span><span class="tp-time-date-mark" aria-hidden="true">{#if kind==='known'}<i></i>{:else}{kind==='missing'?'—':kind==='unknown'?'?':kind==='zero'?'○':'+'}{/if}</span></button></div>
   {/if}
  {/each}</div>{/each}
 </div>{@render dayLegend()}</div></div>
 <p {id} class="tp-chart-note">{copy.tr('Left/Right: one day. Up/Down: one week. Blank cells are outside the period; dashed cells have no records.')} {copy.tr(measure==='cost'?'Intensity uses known costs. Dates marked + do not represent a complete bill.':'Intensity is relative to the highest recorded day. Dates marked + contain only part of the usage; select a day for its exact value.')}</p>
</section>
{:else if variant===1}<section class="tp-time tp-time-pixels" aria-label={copy.tr('Pixel Levels')}><div class="tp-time-meter">
 <SectionTitle>{copy.tr('Daily Levels')}{#snippet aside()}{copy.tr(partial?'Recorded Peak %@':'Peak %@',measure==='tokens'?copy.tr('%@ tokens',copy.format(maximum,measure)):copy.format(maximum,measure))}{/snippet}</SectionTitle>{@render dailyReading()}
 <div class="tp-time-equalizer" role="slider" tabindex="0" aria-label={copy.tr('Choose a Daily Level')} aria-orientation="horizontal" aria-valuemin={1} aria-valuemax={view.days.length} aria-valuenow={index+1} aria-valuetext={dayLabel(view.days[index])} aria-describedby={id} onkeydown={event=>dateKeys(event)} onpointerdown={pointerDown} onpointermove={pointerMove}>
  <div class="tp-time-pixel-columns" style={`--time-days:${view.days.length}`} aria-hidden="true">{#each view.days as item,at (item.date)}{@const value=valueOf(item,measure)}{@const kind=kindOf(item)}{@const lit=value!==null&&maximum!==null&&maximum>0?Math.ceil(value/maximum*12):0}<div class="tp-time-pixel-column" data-kind={kind} data-selected={at===index} data-date={item.date}><span class="tp-time-pixel-caret"></span><span class="tp-time-pixel-stack">{#each Array.from({length:12},(_,i)=>i) as cell}<i data-lit={cell<lit}></i>{/each}</span><span class="tp-time-pixel-status">{kind==='missing'?'—':kind==='unknown'?'?':kind==='zero'?'○':kind==='partial'?'+':''}</span></div>{/each}</div>
 </div><div class="tp-time-axis" aria-hidden="true"><span>{copy.shortDate(first.date)}</span>{#if view.days.length>1}<span>{copy.shortDate(view.days[Math.floor((view.days.length-1)/2)].date)}</span><span>{copy.shortDate(last.date)}</span>{/if}</div>{@render dayLegend(false)}{@render stepper()}
 </div><p {id} class="tp-chart-note">{copy.tr('One column per day, %@ in total. Move the pointer or use arrow keys to select a day. The 12 cells show relative intensity, rounded up, not a live rate.',view.days.length.toLocaleString(language))}</p>
</section>
{:else}<section class="tp-time tp-time-trajectory" aria-label={copy.tr('Cumulative Trajectory')}>
 <SectionTitle>{copy.tr('Recorded Cumulative Path')}{#snippet aside()}{copy.tr('Same Scale · %@-Day Periods',view.days.length.toLocaleString(language))}{/snippet}</SectionTitle>
 <div class="tp-time-series-legend tp-time-cumulative" role="status" aria-live="polite" aria-atomic="true">{#each [reading,before] as sample,at}{@const bounds=at===0?view.bounds:view.priorBounds}<div data-period={at===0?'current':'previous'} data-lower-bound={sample.lower}><span><i class={at===1?'tp-time-prior-key':undefined} aria-hidden="true"></i>{copy.tr(at===0?'Current Period':'Previous Period')}<small>{copy.unit(measure)}</small></span><small>{copy.tr('%@ to %@',copy.shortDate(bounds.start),copy.shortDate(bounds.end))}</small><strong>{cumulativeLabel(sample)}</strong><small>{copy.tr('Through %@ · %@',copy.shortDate(sample.date),copy.tr(sample.total===null?'Cumulative Unknown':sample.lower?'Known Lower Bound':'Recorded Cumulative Total'))}</small></div>{/each}</div>
 <div class="tp-time-trajectory-chart"><div class="tp-time-y-axis" aria-hidden="true"><span>{cumulativeMax!==null&&cumulativeMax>0?copy.format(cumulativeMax,measure):''}</span><span>{cumulativeMax!==null&&cumulativeMax>0?copy.format(cumulativeMax/2,measure):''}</span><span>{cumulativeMax===null?'—':(0).toLocaleString(language)}</span></div>
  <div class="tp-time-trajectory-plot" role="slider" tabindex="0" aria-label={copy.tr('Choose a Cumulative Date')} aria-orientation="horizontal" aria-valuemin={1} aria-valuemax={view.days.length} aria-valuenow={index+1} aria-valuetext={copy.tr('%@. Current cumulative: %@; previous period, day %@: %@.',dayLabel(view.days[index]),cumulativeLabel(reading,false),(index+1).toLocaleString(language),cumulativeLabel(before,false))} aria-describedby={`${id}-note`} onkeydown={event=>dateKeys(event)} onpointerdown={pointerDown} onpointermove={pointerMove}>
   <svg viewBox="0 0 300 184" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><pattern id={`${id}-gap`} patternUnits="userSpaceOnUse" width="6" height="6"><path d="M-1,1L1,-1M0,6L6,0M5,7L7,5" class="tp-time-hatch"/></pattern></defs>{#each [14,94,174] as height}<line x1="0" x2="300" y1={height} y2={height} class="tp-time-gridline"/>{/each}{#each bands as at}{@const width=view.days.length===1?300:300/(view.days.length-1)}{@const left=Math.max(0,x(at)-width/2)}{@const right=Math.min(300,x(at)+width/2)}<rect x={left} y="10" width={right-left} height="168" fill={`url(#${id}-gap)`}/>{/each}<line x1={x(index)} x2={x(index)} y1="8" y2="180" class="tp-time-crosshair"/>{#each [prior,current] as samples,series}<g class={series===0?'tp-time-line-prior':'tp-time-line-current'}><path d={trajectoryPath(samples)} class="tp-time-line" vector-effect="non-scaling-stroke"/></g>{/each}</svg>
   {#each [prior,current] as samples,series}{#each samples as sample,at}{#if sample.point!==null&&(at===index||(at===0||samples[at-1].point===null)&&(at===samples.length-1||samples[at+1].point===null))}<span class="tp-time-plot-dot" aria-hidden="true" data-prior={series===0} data-selected={at===index} style={`left:${x(at)/3}%;top:${y(sample.point)/184*100}%`}></span>{/if}{/each}{/each}
   {#if cumulativeMax===null}<p class="tp-time-no-trajectory">{copy.tr(measure==='cost'?'Cost Unknown':'No Recorded Data')}<small>{copy.tr('No invented curve is drawn.')}</small></p>{/if}
  </div><div class="tp-time-axis" aria-hidden="true"><span>{copy.tr('Day %@',(1).toLocaleString(language))}</span>{#if view.days.length>1}<span>{copy.tr('Day %@',view.days.length.toLocaleString(language))}</span>{/if}</div>
 </div><div class="tp-time-trajectory-reading">{@render dailyReading()}</div>{@render stepper()}<p id={`${id}-note`} class="tp-chart-note">{copy.tr(comparable?'Periods align by day number and compare recorded values only.':'Incomplete records. No increase or decrease is inferred; incomplete cumulative values are known lower bounds.')} {copy.tr('Gaps break the line. Later points add only known values; no zero filling or forecasts.')}</p>
</section>{/if}
