import {accountSchema,historyRows,type Account} from '../../src/desktop';

export type ModelRecord=Account['history'][number]['models'][number];
export type HistoryRecord=ReturnType<typeof historyRows>[number];
// Fixture-only evidence. The current desktop contract has no total-confidence field.
export type Fixture={
 id:string;label:string;state:'ready'|'loading'|'error'|'empty';
 row:HistoryRecord;partial:boolean;
 coverage:{synthetic:true;totalTrusted:boolean;note:string};
};
const model=(model:string,tokens:number,cost:number|null,variants:ModelRecord['variants']=[]):ModelRecord=>({model,tokens,cost,variants});
const normal=[
 model('Claude Sonnet 4.5',37000,1.48,[{model:'claude-sonnet-4-5-20250929',tokens:21000,cost:.84},{model:'claude-sonnet-4-5-thinking',tokens:16000,cost:.64}]),
 model('Claude Opus 4.1',22000,2.64),model('Claude Haiku 4.5',19000,.19),
 model('Claude Sonnet 4',14000,.56),model('Claude Haiku 3.5',8000,.08),
];
const many=Array.from({length:40},(_,i)=>model(i===0?'claude-sonnet-4-5-20250929-thinking-with-extended-context-and-experimental-routing-long-model-name':`合成模型 ${String(i+1).padStart(2,'0')} · long-context-preview`,(40-i)*100,i%3===0?null:(40-i)/100));
type Scenario={id:string;label:string;models:ModelRecord[];total:number;trusted?:boolean;partial?:boolean;state?:Fixture['state'];note:string};
const scenarios:Scenario[]=[
 {id:'normal',label:'完整 · 37 / 22 / 19 / 14 / 8',models:normal,total:100000,note:'同一日的全部模型与总数一致。'},
 {id:'equal',label:'等比例 · 四个模型',models:normal.slice(0,4).map(m=>({...m,tokens:25000,variants:[]})),total:100000,note:'四个模型各占四分之一。'},
 {id:'missing',label:'缺少部分模型记录',models:normal.slice(0,3),total:100000,note:'模型仅解释 78,000 tokens，余下 22,000 明确归为未归类记录。'},
 {id:'unknown-cost',label:'全部费用未知',models:normal.map(m=>({...m,cost:null,variants:m.variants.map(v=>({...v,cost:null}))})),total:100000,note:'费用全部为 null，不能填零或声称免费。'},
 {id:'partial-cost',label:'部分费用未知',models:normal.map((m,i)=>i%2?{...m,cost:null}:m),total:100000,note:'费用只展示每条已知值，不把已知部分说成总账单。'},
 {id:'partial-source',label:'来源只覆盖部分使用',models:normal,total:100000,partial:true,note:'来源覆盖不完整；只说已记录 tokens 占比。'},
 {id:'zero',label:'总量与模型全零',models:normal.slice(0,3).map(m=>({...m,tokens:0,cost:null,variants:[]})),total:0,note:'零记录不能画占比，未知费用仍未知。'},
 {id:'conflict',label:'模型合计大于总量',models:normal,total:80000,note:'模型合计 100,000，大于该期记录总数 80,000。'},
 {id:'untrusted',label:'总量不可确认',models:normal,total:100000,trusted:false,note:'数值虽然相等，但合成证据无法确认总数，不绘制占比。'},
 {id:'many',label:'40 模型 · 超长名称',models:many,total:many.reduce((s,m)=>s+m.tokens,0),note:'超过六个非零部分时，环形方案回到明细列表，不用小色块隐藏模型。'},
 {id:'tiny',label:'极小值与真实零记录',models:[model('主要模型',99999,3),model('极小但非零模型',1,null),model('真实零记录',0,null)],total:100000,note:'不抬高最小条长度；零记录没有条形或环形扇区。'},
 {id:'loading',label:'加载中',models:[],total:0,state:'loading',note:'模拟等待，不调用后端。'},
 {id:'error',label:'读取失败',models:[],total:0,state:'error',note:'模拟错误，按钮只重新载入本地合成数据。'},
 {id:'empty',label:'没有模型记录',models:[],total:0,state:'empty',note:'无记录与全零数据分开表达。'},
];
export const scenarioOptions=scenarios.map(({id,label})=>({value:id,label}));
export function fixtureFor(id:string,scope:'account'|'device'):Fixture {
 const spec=scenarios.find(s=>s.id===id)??scenarios[0];
 // Validate the actual product contract, then use the real account/device owner path.
 const account=accountSchema.parse({
  id:'synthetic-claude-1',family:'claude',name:'Claude',email:'research@example.test',plan:'',enabled:true,tray:false,removable:false,apiKey:false,
  note:'',error:'',fetchedAt:'2026-10-22T00:05:00Z',metrics:[],observations:[],historyScope:scope,historyPartial:spec.partial??false,
  history:[{date:'2026-10-21',tokens:spec.total,cost:null,models:spec.models}],
 });
 return {id:spec.id,label:spec.label,state:spec.state??'ready',row:historyRows([account],'all')[0],partial:account.historyPartial,
  coverage:{synthetic:true,totalTrusted:spec.trusted!==false,note:spec.note}};
}

export const exact=(value:number)=>new Intl.NumberFormat('en-US',{maximumFractionDigits:20}).format(value);
export const cost=(value:number|null)=>value==null?'费用未知':`US$${new Intl.NumberFormat('en-US',{minimumFractionDigits:2,maximumFractionDigits:20}).format(value)}`;
export const share=(value:number,total:number)=>{
 const percent=value/total*100;
 return percent>0&&percent<.01?'<0.01%':`${new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(percent)}%`;
};
export function composition(fixture:Fixture) {
 const {row,coverage}=fixture;
 const sum=row.models.reduce((s,m)=>s+m.tokens,0);
 let reason='';
 if(!coverage.totalTrusted||!Number.isFinite(row.tokens)||row.tokens<0)reason='该期记录总数不可确认，不计算占比。';
 else if(row.models.some(m=>!Number.isFinite(m.tokens)||m.tokens<0))reason='模型 token 记录无效，不计算占比。';
 else if(sum>row.tokens)reason=`模型合计 ${exact(sum)}，超过该期记录总数 ${exact(row.tokens)} tokens，不计算占比。`;
 else if(row.tokens===0)reason='该期记录总数为 0 tokens，没有可比较的占比。';
 const remainder=reason?0:row.tokens-sum;
 return {sum,remainder,reason,valid:!reason,total:row.tokens};
}
