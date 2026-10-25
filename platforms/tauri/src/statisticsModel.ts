import {dateKey,historyBounds,summarizeHistory} from './historyModel';
import type {historyRows,Account} from './desktop';
export const statisticsKey='tokenplan.statistics.v1';
export const moduleIDs=['activity','sources','quota','records'] as const;
export type ModuleID=typeof moduleIDs[number];
export const moduleTitles={activity:'Usage Activity',sources:'Source Composition',quota:'Quota Changes',records:'Daily Records'};
export const moduleStyles={activity:['Activity Calendar','Folded Bands','Daily Bars'],sources:['Source Treemap','Source List'],quota:['Quota Line','Observation List'],records:[]} as const;
export type StatisticsPreferences={order:ModuleID[];enabled:Record<ModuleID,boolean>;styles:Record<ModuleID,string>};
export function defaultStatistics():StatisticsPreferences{return {order:[...moduleIDs],enabled:{activity:true,sources:true,quota:true,records:true},styles:{activity:'Daily Bars',sources:'Source List',quota:'Quota Line',records:''}};}
export function readStatistics(raw:string|null):StatisticsPreferences {
 if(!raw)return defaultStatistics();const p=JSON.parse(raw);
 if(!p||!Array.isArray(p.order)||p.order.length!==4||new Set(p.order).size!==4||p.order.some((id:ModuleID)=>!moduleIDs.includes(id))||moduleIDs.some(id=>typeof p.enabled?.[id]!=='boolean'||!(id==='records'?p.styles?.[id]==='':(moduleStyles[id] as readonly string[]).includes(p.styles?.[id]))))throw new Error('Invalid statistics preferences');
 return p;
}
export function activityDays(rows:ReturnType<typeof historyRows>,range:string,now=new Date()) {
 const {start}=historyBounds(range,now);
 return Array.from({length:range==='30'?30:1},(_,i)=>{const date=new Date(`${start}T12:00:00`);date.setDate(date.getDate()+i);const key=dateKey(date),entries=rows.filter(r=>r.date===key);return {date:key,value:entries.length?summarizeHistory(entries).tokens:null};});
}
export function sourceParts(rows:ReturnType<typeof historyRows>) {
 const totals=new Map<string,number>();for(const r of rows)totals.set(r.provider,(totals.get(r.provider)??0)+r.tokens);
 return [...totals].map(([label,value])=>({label,value})).filter(p=>Number.isFinite(p.value)&&p.value>0).sort((a,b)=>b.value-a.value);
}
// Binary area partition: no minimum area, so small shares are never exaggerated.
export function treeRects(parts:{label:string;value:number}[],x=0,y=0,w=100,h=60):{label:string;value:number;x:number;y:number;w:number;h:number}[] {
 if(!parts.length)return [];if(parts.length===1)return [{...parts[0],x,y,w,h}];
 const sum=parts.reduce((n,p)=>n+p.value,0);let cut=1,left=parts[0].value;
 while(cut<parts.length-1&&left+parts[cut].value<=sum/2){left+=parts[cut++].value;}
 const fraction=left/sum;
 return w>=h?[...treeRects(parts.slice(0,cut),x,y,w*fraction,h),...treeRects(parts.slice(cut),x+w*fraction,y,w*(1-fraction),h)]:[...treeRects(parts.slice(0,cut),x,y,w,h*fraction),...treeRects(parts.slice(cut),x,y+h*fraction,w,h*(1-fraction))];
}
export function quotaSeries(accounts:Account[],range:string) {
 const bounds=historyBounds(range);
 return accounts.flatMap(a=>{
  const groups=new Map<string,Account['observations']>();
  for(const o of a.observations){const time=Date.parse(o.date);if(!Number.isFinite(time))continue;const day=dateKey(new Date(time));if(day<bounds.start||day>bounds.end)continue;
   const key=JSON.stringify([o.label,o.unit]);groups.set(key,[...(groups.get(key)??[]),o]);}
  return [...groups].map(([key,points])=>({id:JSON.stringify([a.id,key]),name:[a.name,a.email,points[0].label].filter(Boolean).join(' · '),unit:points[0].unit,points:points.sort((x,y)=>Date.parse(x.date)-Date.parse(y.date))}));
 });
}
