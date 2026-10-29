import {historyRows,type Account} from './desktop';
import {dateKey,historyBounds,summarizeHistory} from './historyModel';
import {providerText} from './providerText';
import {providerTheme} from './providerTheme';

export type StatisticsMeasure='tokens'|'cost';
export type StatisticsRange='1'|'yesterday'|'7'|'30';
type Rows=ReturnType<typeof historyRows>;
const shifted=(first:string,offset:number)=>{
 const day=new Date(`${first}T12:00:00`);day.setDate(day.getDate()+offset);return dateKey(day);
};
function sumRows(rows:Rows) {
 const total=summarizeHistory(rows);
 return {tokens:rows.length?total.tokens:null,cost:total.cost,records:rows.length,knownCosts:rows.filter(row=>row.cost!==null).length};
}

/** The helper owns history. Only recorded days are counted; an absent owner/day is never a zero. */
export function statisticsView(accounts:Account[],range:StatisticsRange,now=new Date()) {
 const all=historyRows(accounts,'all'),bounds=historyBounds(range,now),length=range==='yesterday'?1:Number(range);
 const priorBounds={start:shifted(bounds.start,-length),end:shifted(bounds.start,-1)};
 const rows=all.filter(row=>row.date>=bounds.start&&row.date<=bounds.end);
 const prior=all.filter(row=>row.date>=priorBounds.start&&row.date<=priorBounds.end);
 // Accounts with no history capability are not made into fictitious zero-valued sources.
 // An owner seen in either period must, however, be present throughout both for a comparison.
 const owners=new Set([...rows,...prior].map(row=>row.owner));
 const contributors=accounts.filter(account=>owners.has(account.historyScope==='device'?account.family:account.id));
 const flagged=contributors.some(account=>account.historyPartial);
 const daysFor=(entries:Rows,first:string,expected:Set<string>)=>Array.from({length},(_,index)=>{
  const date=shifted(first,index),items=entries.filter(row=>row.date===date),sum=sumRows(items);
  const incomplete=expected.size===0||new Set(items.map(row=>row.owner)).size<expected.size;
  return {date,...sum,incomplete,partial:items.length>0&&(sum.knownCosts<items.length||incomplete)};
 });
 const days=daysFor(rows,bounds.start,owners),previousDays=daysFor(prior,priorBounds.start,owners);
 const families=[...new Set(contributors.map(account=>account.family))];
 const sources=families.map(key=>{
  const members=contributors.filter(account=>account.family===key),name=members[0].name;
  const sourceOwners=new Set(members.map(account=>account.historyScope==='device'?account.family:account.id));
  const current=rows.filter(row=>sourceOwners.has(row.owner)),before=prior.filter(row=>sourceOwners.has(row.owner));
  const modelNames=[...new Set(current.flatMap(row=>row.models.map(model=>model.model)))];
  const models=modelNames.map(name=>{
   const items=current.flatMap(row=>row.models.filter(model=>model.model===name)),known=items.filter(model=>model.cost!==null);
   return {name,tokens:items.reduce((sum,model)=>sum+model.tokens,0),cost:known.length?known.reduce((sum,model)=>sum+model.cost!,0):null,
    partial:known.length<items.length};
  });
  const theme=providerTheme(key),color=`light-dark(${theme['--provider-light' as keyof typeof theme]}, ${theme['--provider-dark' as keyof typeof theme]})`;
  return {key,name,color,...sumRows(current),previous:sumRows(before),models,
   days:daysFor(current,bounds.start,sourceOwners),previousDays:daysFor(before,priorBounds.start,sourceOwners)};
 });
 const total=sumRows(rows),previous=sumRows(prior),covered=days.filter(day=>day.records>0).length;
 const previousCovered=previousDays.filter(day=>day.records>0).length;
 const partial=flagged||days.some(day=>day.incomplete),previousPartial=flagged||previousDays.some(day=>day.incomplete);
 return {rows,prior,total,previous,sources,days,previousDays,bounds,priorBounds,length,covered,previousCovered,
  active:days.filter(day=>(day.tokens??0)>0).length,sourceCount:new Set(rows.map(row=>row.owner)).size,
  partial,previousPartial,costComplete:total.records>0&&total.knownCosts===total.records&&!flagged,
  comparable:!partial&&!previousPartial&&covered===length&&previousCovered===length};
}
export type StatisticsView=ReturnType<typeof statisticsView>;
export type StatisticsSource=StatisticsView['sources'][number];
export type StatisticsDay=StatisticsView['days'][number];
export type StatisticsChartProps={
 view:StatisticsView;variant:number;measure:StatisticsMeasure;language:string;
 selected:string|null;onSelect:(key:string|null)=>void;day:string|null;onDay:(date:string|null)=>void;
};
export const valueOf=(item:{tokens:number|null;cost:number|null},measure:StatisticsMeasure)=>item[measure];
export function canCompare(view:StatisticsView,measure:StatisticsMeasure) {
 return view.comparable&&(measure==='tokens'||view.costComplete&&view.previous.knownCosts===view.previous.records);
}

/** Translate before interpolation, so reordered placeholders and exact values survive every language. */
export function statisticsCopy(language:string) {
 const tr=(key:string,...values:(string|number)[])=>{
  let index=0;
  return providerText(key,language).replace(/%(?:(\d+)\$)?@/g,(_,position)=>String(values[position?Number(position)-1:index++]??''));
 };
 const exact=(value:number|null)=>value===null?tr('Unknown'):value.toLocaleString(language,{maximumFractionDigits:0});
 const compact=(value:number|null)=>value===null?tr('Unknown'):value.toLocaleString(language,{notation:'compact',maximumFractionDigits:2});
 // Small nonzero recorded costs remain visible instead of being displayed as free.
 const money=(value:number|null)=>value===null?tr('Unknown'):value.toLocaleString(language,{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:value!==0&&Math.abs(value)<.01?6:2});
 const format=(value:number|null,measure:StatisticsMeasure,short=true)=>measure==='tokens'?(short?compact(value):exact(value)):
  short&&value!==null&&Math.abs(value)>=1e6?`$${compact(value)}`:money(value);
 const shortDate=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString(language,{month:'numeric',day:'numeric'});
 return {tr,exact,compact,money,format,shortDate,
  metricLabel:(measure:StatisticsMeasure)=>tr(measure==='tokens'?'Recorded Tokens':'Known Cost'),
  unit:(measure:StatisticsMeasure)=>measure==='tokens'?'tokens':'USD',
  signed:(value:number,measure:StatisticsMeasure)=>`${value<0?'−':value>0?'+':''}${format(Math.abs(value),measure)}`};
}
