import {accountSchema,historyRows,type Account} from '../../src/desktop';
import {dateKey,historyBounds,summarizeHistory} from '../../src/historyModel';

export type Measure='tokens'|'cost';
export type Range='1'|'7'|'30'|'yesterday';
export const providers=[
 {key:'claude',name:'Claude',tokens:12400000,cents:6480,priorTokens:11100000,priorCents:6010,models:['Claude Sonnet 4.5','Claude Opus 4.1']},
 {key:'codex',name:'Codex',tokens:6260000,cents:2370,priorTokens:4160000,priorCents:1980,models:['GPT-5 Codex','GPT-5']},
 {key:'cursor',name:'Cursor',tokens:4420000,cents:2790,priorTokens:4850000,priorCents:3020,models:['Auto','Claude Sonnet 4.5']},
 {key:'antigravity',name:'Antigravity',tokens:470000,cents:194,priorTokens:310000,priorCents:148,models:['Gemini 2.5 Pro','Gemini 2.5 Flash']},
 {key:'grok',name:'Grok',tokens:1310000,cents:426,priorTokens:1120000,priorCents:375,models:['Grok Code Fast','Grok 4']},
];
export const scenarios=[
 {value:'normal',label:'完整示例'}, {value:'gaps',label:'缺少 6 天'},
 {value:'partial',label:'部分费用未知'}, {value:'unknown',label:'费用全部未知'},
 {value:'zero',label:'真实零用量'}, {value:'empty',label:'没有记录'},
 {value:'single',label:'只有一个来源'}, {value:'large',label:'长名称与大数值'},
 {value:'many',label:'40 个账号'}, {value:'device',label:'重复设备记录'},
 {value:'loading',label:'模拟读取中'}, {value:'error',label:'模拟读取失败'},
];
// Fictional totals, not prices or current model capabilities. The two amounts are
// independently specified; token counts never invent a missing price.
const weights=[23,32,28,37,18,11,34,41,32,26,49,17,13,38,29,42,35,56,21,9,44,52,38,61,46,24,16,43,57,35];
function allocate(total:number,parts:number[]) {
 const sum=parts.reduce((n,p)=>n+p,0),out=parts.map(p=>Math.floor(total*p/sum));
 let remaining=total-out.reduce((n,p)=>n+p,0);
 for(let i=0;remaining>0;i++,remaining--)out[i%out.length]++;
 return out;
}
function shifted(now:Date,amount:number) {
 const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()+amount);return dateKey(d);
}
export function makeAccounts(scenario:string,now:Date):Account[] {
 const catalog=scenario==='single'?providers.slice(0,1):providers;
 const copies=scenario==='many'?8:1;
 const accounts=catalog.flatMap((provider,p)=>Array.from({length:copies},(_,copy)=>{
  const factor=scenario==='large'?10007:copies>1?1/(copy+1):1;
  const history:Account['history']=[];
  for(let period=0;period<2;period++) {
   const w=weights.map((value,i)=>value*(1+((i*3+p*7+period*2)%11)/16));
   const tokenParts=allocate(Math.round((period?provider.priorTokens:provider.tokens)*factor),w);
   const costs=allocate(Math.round((period?provider.priorCents:provider.cents)*factor),w.map((v,i)=>v*(1+(i+p)%3/8)));
   for(let i=0;i<30;i++) {
    if(scenario==='gaps'&&!period&&[3,8,12,19,23,27].includes(i))continue;
    const tokens=scenario==='zero'?0:tokenParts[i];
    const cost=scenario==='unknown'||scenario==='partial'&&((i+p)%3===0||p===3)?null:scenario==='zero'?0:costs[i]/100;
    const first=Math.round(tokens*(.62+p*.04));
    const firstCost=cost===null?null:Math.round(cost*100*.7)/100;
    history.push({date:shifted(now,i-29-period*30),tokens,cost,models:[
     {model:scenario==='large'?`${provider.models[0]} · research-and-platform-observability-preview`:provider.models[0],tokens:first,cost:firstCost,variants:[]},
     {model:provider.models[1],tokens:tokens-first,cost:cost===null?null:Math.round((cost-firstCost!)*100)/100,variants:[]},
    ]});
   }
  }
  return accountSchema.parse({
   id:`total-lab-${provider.key}-${copy}`,family:provider.key,name:provider.name,
   email:scenario==='large'?`research-and-platform-observability-team+${provider.key}@fictional-workspace.example`:`studio${copies>1?copy+1:''}@example.com`,
   plan:'示例账号',enabled:true,tray:false,removable:true,apiKey:false,
   note:'为设计比较生成的虚构记录，不代表真实账号、模型价格或账单。',
   error:'',fetchedAt:now.toISOString(),metrics:[],
   historyScope:scenario==='device'?'device':'account',historyPartial:scenario==='partial'||scenario==='gaps',
   history:['empty','error','loading'].includes(scenario)?[]:history,
  });
 }));
 return scenario==='device'?[...accounts,...accounts.map(a=>({...a,id:`${a.id}-duplicate`,email:'duplicate@example.com'}))]:accounts;
}

function sumRows(rows:ReturnType<typeof historyRows>) {
 const sum=summarizeHistory(rows);
 return {tokens:rows.length?sum.tokens:null,cost:sum.cost===null?null:Math.round(sum.cost*100)/100,
  records:rows.length,knownCosts:rows.filter(r=>r.cost!==null).length};
}
export function buildView(accounts:Account[],range:Range,scope:string,now:Date) {
 const scoped=scope==='all'?accounts:accounts.filter(a=>a.family===scope);
 const all=historyRows(scoped,'all'),bounds=historyBounds(range,now),length=range==='yesterday'?1:Number(range);
 const start=new Date(`${bounds.start}T12:00:00`),priorStart=shifted(start,-length),priorEnd=shifted(start,-1);
 const rows=all.filter(r=>r.date>=bounds.start&&r.date<=bounds.end);
 const prior=all.filter(r=>r.date>=priorStart&&r.date<=priorEnd);
 const daysFor=(entries:typeof rows,first:string)=>Array.from({length},(_,i)=>{
  const date=shifted(new Date(`${first}T12:00:00`),i),items=entries.filter(r=>r.date===date),sum=sumRows(items);
  return {date,...sum,partial:items.length>0&&sum.knownCosts<items.length};
 });
 const days=daysFor(rows,bounds.start),previousDays=daysFor(prior,priorStart);
 const sources=providers.filter(p=>scoped.some(a=>a.family===p.key)).map(provider=>{
  const owners=new Set(scoped.filter(a=>a.family===provider.key).map(a=>a.historyScope==='device'?a.family:a.id));
  const current=rows.filter(r=>owners.has(r.owner)),before=prior.filter(r=>owners.has(r.owner));
  const models=[...new Set(current.flatMap(r=>r.models.map(m=>m.model)))].map(name=>{
   const items=current.flatMap(r=>r.models.filter(m=>m.model===name)),known=items.filter(m=>m.cost!==null);
   return {name,tokens:items.reduce((n,m)=>n+m.tokens,0),cost:known.length?Math.round(known.reduce((n,m)=>n+m.cost!,0)*100)/100:null};
  });
  return {...provider,...sumRows(current),previous:sumRows(before),color:`var(--tp-${provider.key})`,
   days:daysFor(current,bounds.start),previousDays:daysFor(before,priorStart),models};
 });
 const total=sumRows(rows),previous=sumRows(prior),covered=days.filter(d=>d.records>0).length;
 const previousCovered=previousDays.filter(d=>d.records>0).length;
 return {rows,prior,total,previous,sources,days,previousDays,bounds,priorBounds:{start:priorStart,end:priorEnd},length,covered,previousCovered,
  active:days.filter(d=>(d.tokens??0)>0).length,accountCount:scoped.length,
  sourceCount:new Set(rows.map(r=>r.owner)).size,
  partial:scoped.some(a=>a.historyPartial)||covered<length,
  costComplete:total.records>0&&total.knownCosts===total.records,
  comparable:covered===length&&previousCovered===length&&!scoped.some(a=>a.historyPartial),
 };
}
export type LabView=ReturnType<typeof buildView>;
export type Source=LabView['sources'][number];
export type Day=LabView['days'][number];
export type StudyProps={
 view:LabView;variant:number;measure:Measure;selected:string|null;onSelect:(key:string|null)=>void;
 day:string|null;onDay:(date:string|null)=>void;budget:number;onBudget:(value:number)=>void;
};
export const exact=(value:number|null)=>value===null?'未知':new Intl.NumberFormat('zh-CN',{maximumFractionDigits:0}).format(value);
export const compact=(value:number|null)=>value===null?'未知':new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:2}).format(value);
export const money=(value:number|null)=>value===null?'未知':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(value);
export const valueOf=(item:{tokens:number|null;cost:number|null},measure:Measure)=>item[measure];
export const format=(value:number|null,measure:Measure,short=true)=>measure==='tokens'?(short?compact(value):exact(value)):(short&&value!==null&&Math.abs(value)>=1e6?`$${compact(value)}`:money(value));
export const metricLabel=(measure:Measure)=>measure==='tokens'?'已记录 Tokens':'已知费用';
export const unit=(measure:Measure)=>measure==='tokens'?'tokens':'USD';
export const shortDate=(date:string)=>`${Number(date.slice(5,7))}/${Number(date.slice(8,10))}`;
export const signed=(value:number,measure:Measure)=>`${value<0?'−':value>0?'+':''}${format(Math.abs(value),measure)}`;
export function canCompare(view:LabView,measure:Measure) {
 return view.comparable&&(measure==='tokens'||view.costComplete&&view.previous.knownCosts===view.previous.records);
}
