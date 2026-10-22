import {useEffect,useState} from 'react';
import {accountSchema,type Account} from '../../src/desktop';
import {dateKey,historyBounds,historyRange,summarizeHistory} from '../../src/historyModel';

export const scenarios=[
 {value:'normal',label:'完整记录'},
 {value:'zero',label:'真实零值'},
 {value:'gaps',label:'缺少 6 天'},
 {value:'unknown',label:'费用全部未知'},
 {value:'partial',label:'费用部分已知'},
 {value:'empty',label:'没有历史记录'},
 {value:'error',label:'读取失败'},
 {value:'long',label:'长内容与大数值'},
 {value:'device',label:'设备记录去重'},
 {value:'loading',label:'模拟读取中'},
];

// Dates move; the synthetic amounts do not. Never import designPreview's null→0 helper.
export function accountsFor(scenario:string,now:Date):Account[] {
 // Explicit fictional token/cost pairs, not a pricing formula or imputed unknown costs.
 const samples=[[42000,.42],[78000,.78],[32000,.32],[96000,.96],[60000,.60],[24000,.24],[54000,.54]] as const;
 const missing=new Set([2,3,9,14,20,25]);
 const history:Account['history']=Array.from({length:30},(_,age)=>{
  const date=new Date(now);date.setHours(12,0,0,0);date.setDate(date.getDate()-age);
  const [sampleTokens,sampleCost]=samples[age%samples.length],factor=scenario==='long'?100003:1;
  const tokens=scenario==='zero'?0:sampleTokens*factor;
  const cost=scenario==='unknown'||scenario==='partial'&&age%2===1?null:scenario==='zero'?0:sampleCost*factor;
  return {date:dateKey(date),tokens,cost,models:[]};
 }).filter((_,age)=>scenario!=='gaps'||!missing.has(age));
 const account=accountSchema.parse({
  id:'history-lab-claude',family:'claude',name:'Claude',
  email:scenario==='long'?'research-and-platform-observability-team+long-history-example@fictional-workspace.example':'alex@example.com',
  plan:scenario==='long'?'Team · 跨区域研究与开发协作工作空间（虚构示例）':'Pro',
  enabled:true,tray:false,removable:true,apiKey:false,
  note:scenario==='long'?'这个虚构账号用于检验较长的账号标识、费用与 token 数值。记录来自多个研究任务，当前只比较历史区的阅读体验，不推断模型单价、套餐额度、计费周期或实际账单。':'固定虚构记录，用于比较历史汇总，不代表真实账号或账单。',
  error:scenario==='error'?'示例历史文件暂时无法读取。':'',fetchedAt:now.toISOString(),metrics:[],
  historyScope:scenario==='device'?'device':'account',historyPartial:scenario==='partial',
  history:['empty','error','loading'].includes(scenario)?[]:history,
 });
 return scenario==='device'?[account,accountSchema.parse({...account,id:'history-lab-second',email:'second@example.com'})]:[account];
}

// HistorySummary uses the real local clock internally. Rebase the fixtures at each local
// midnight and on focus/visibility resume; no global Date replacement or historical anchor.
export function useLocalDay() {
 const [day,setDay]=useState<string|null>(null);
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>;
  const update=()=>{
   clearTimeout(timer);
   const now=new Date();setDay(dateKey(now));
   const midnight=new Date(now);midnight.setHours(24,0,0,0);
   timer=setTimeout(update,midnight.getTime()-now.getTime()+25);
  };
  update();window.addEventListener('focus',update);document.addEventListener('visibilitychange',update);
  return()=>{clearTimeout(timer);window.removeEventListener('focus',update);document.removeEventListener('visibilitychange',update);};
 },[]);
 return day;
}

export function historyView(accounts:Account[],range:string,now:Date) {
 const bounds=historyBounds(range,now),rows=historyRange(accounts,'all',range,now),total=summarizeHistory(rows);
 const days=Array.from({length:range==='30'?30:1},(_,index)=>{
  const date=new Date(`${bounds.start}T12:00:00`);date.setDate(date.getDate()+index);
  const key=dateKey(date),entries=rows.filter(row=>row.date===key);
  const sum=summarizeHistory(entries);
  return {key,tokens:entries.length?sum.tokens:null,cost:sum.cost,records:entries.length};
 });
 return {bounds,rows,total,days,covered:days.filter(day=>day.tokens!==null).length,
  costRecords:rows.filter(row=>row.cost!==null).length,partial:accounts.some(account=>account.historyPartial)};
}
export type HistoryView=ReturnType<typeof historyView>;
export type SummaryProps={view:HistoryView;range:string;onRange:(value:string)=>void;onExample:()=>void};
export const number=(value:number)=>new Intl.NumberFormat('zh-Hans',{maximumFractionDigits:0}).format(value);
export const compact=(value:number)=>new Intl.NumberFormat('zh-Hans',{notation:'compact',maximumFractionDigits:1}).format(value);
export const money=(value:number|null)=>value===null?'未知':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
