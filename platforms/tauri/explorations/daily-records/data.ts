import {accountSchema, type Account, historyRows} from '../../src/desktop';
import {dateKey, historyRange, summarizeHistory} from '../../src/historyModel';

// All date filtering uses this same local calendar reference, never the wall clock.
export const reference = new Date('2026-10-22T12:00:00');
export type Row = ReturnType<typeof historyRows>[number];
type Daily = Account['history'][number];
export const scenarios = [
 {value:'normal',label:'正常 · 两个来源'}, {value:'mixed',label:'未知费用与部分记录'},
 {value:'zero',label:'明确记录的零活动'}, {value:'gaps',label:'日期有缺口'},
 {value:'dedupe',label:'本机记录去重'}, {value:'long',label:'长账号与模型名'},
 {value:'many',label:'40 条记录'}, {value:'empty',label:'没有记录'},
 {value:'error',label:'读取失败与恢复'}, {value:'loading',label:'读取中'},
];
function day(offset:number) {
 const value=new Date(reference);value.setDate(value.getDate()-offset);return dateKey(value);
}
function record(offset:number,tokens:number,cost:number|null,long=false):Daily {
 return {date:day(offset),tokens,cost,models:tokens===0?[]:[
  {model:long?'claude-sonnet-4-5-thinking-with-extended-context-experimental-20261022':'Claude Sonnet 4.5',tokens:Math.round(tokens*.7),cost:cost===null?null:cost*.7,
   variants:[{model:'claude-sonnet-4-5-20250929',tokens:Math.round(tokens*.7),cost:cost===null?null:cost*.7}]},
  {model:'Claude Haiku 4.5',tokens:tokens-Math.round(tokens*.7),cost:cost===null?null:cost*.3,variants:[]},
 ]};
}
function account(id:string,family:string,email:string,scope:'device'|'account',history:Daily[]):Account {
 return accountSchema.parse({id,family,name:family==='claude'?'Claude':'Cursor',email,plan:'Pro',enabled:true,tray:false,removable:true,apiKey:false,
  note:'虚构记录，仅供组织方式比较',error:'',fetchedAt:'2026-10-22T12:00:00',metrics:[],historyScope:scope,history});
}
export function fixture(scenario:string) {
 const offsets=scenario==='gaps'?[0,1,4,8,13]:Array.from({length:8},(_,i)=>i);
 let a=offsets.map((offset,i)=>record(offset,[184200,96100,235600,42100,174300,89000,138000,65000][i%8],2.64+i*.31,scenario==='long'));
 let b=offsets.map((offset,i)=>record(offset,[128600,65200,102000,78100,96400,120000,54000,32000][i%8],1.28+i*.13));
 if(scenario==='mixed') {
  a=[record(0,184200,2.64),record(1,96100,null),record(3,42000,1.12)];
  b=[record(0,128600,null),record(1,65200,null),record(3,29000,.81)];
 }
 if(scenario==='zero'){a=[record(0,0,0)];b=[record(0,0,0)];}
 if(scenario==='many') {
  a=Array.from({length:20},(_,i)=>record(i*2,30000+i*4211,.64+i*.09));
  b=Array.from({length:20},(_,i)=>record(i*2+1,60000+i*3117,1.14+i*.08));
 }
 if(['empty','error','loading'].includes(scenario)){a=[];b=[];}
 const accounts=[account('claude-personal','claude','local@example.com','device',a),
  account('cursor-work','cursor',scenario==='long'?'research-and-infrastructure-international-team@very-long-example-domain.example':'lin@example.com','account',b)];
 if(scenario==='mixed')accounts[0].historyPartial=true;
 // Same Claude family and device history in a second account. historyRows must count it once.
 if(scenario==='dedupe')accounts.push({...accounts[0],id:'claude-work',email:'work@example.com'});
 const rows=historyRange(accounts,'all','90',reference);
 return {accounts,rows,days:[...new Set(rows.map(row=>row.date))],partial:accounts.some(a=>a.historyPartial)};
}
export const money=(value:number|null)=>value===null?'—':new Intl.NumberFormat('zh-Hans',{style:'currency',currency:'USD',currencyDisplay:'narrowSymbol',maximumFractionDigits:2}).format(value);
export const number=(value:number)=>new Intl.NumberFormat('zh-Hans',{notation:'compact',maximumFractionDigits:1}).format(value);
export const dateLabel=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('zh-Hans',{month:'short',day:'numeric'});
export const weekday=(date:string)=>new Date(`${date}T12:00:00`).toLocaleDateString('zh-Hans',{weekday:'short'});
export function costLabel(rows:Row[]) {
 const sum=summarizeHistory(rows);
 return sum.cost===null?'费用未知':rows.some(r=>r.cost===null)?'已知费用（部分）':'已记录费用';
}
