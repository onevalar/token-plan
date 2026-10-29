import {accountSchema,metricSchema,type Account,type Metric} from '../../src/desktop';
import {quotaReading,quotaMeter} from '../../src/homeUsage';
import {countdown} from '../../src/usage';

export type Variant=0|1|2;
export type StudyProps={
 metrics:Metric[];variant:Variant;remaining:boolean;now:number;missing:string;
 selected:string|null;onSelect:(metricId:string)=>void;
};
export const now=Date.parse('2026-10-28T08:00:00Z');
export const scenarios=[
 {value:'normal',label:'日常 · 四个服务'},
 {value:'single',label:'专注 · 一个账号'},
 {value:'bounds',label:'0%、100%、超额与小数'},
 {value:'threshold',label:'79.6% 与 80% 警戒边界'},
 {value:'missing',label:'缺失、旧读数与未知额度'},
 {value:'reset',label:'未开始、到期与未知周期'},
 {value:'shapes',label:'单项、三项、同周期与余额'},
 {value:'many',label:'40 项额度 · 长名称'},
 {value:'loading',label:'正在读取'},
 {value:'error',label:'读取失败'},
 {value:'empty',label:'没有账号'},
] as const;
export type Scenario=typeof scenarios[number]['value'];
export type Simulation={session:number;weekly:number;elapsed:number|null};
export const initialSimulation:Simulation={session:38,weekly:82,elapsed:null};

function quota(id:string,label:string,used:number|null,seconds:number|null,resetIn:number|null):Metric {
 return metricSchema.parse({id,label,percent:used,periodSeconds:seconds,placement:'home',pinned:false,pinnable:true,
  hasData:used!==null,unit:'percent',amount:null,values:[],resetsAt:resetIn===null?null:new Date(now+resetIn*1000).toISOString()});
}
function amount(id:string,label:string,value:number|null,unit='dollars'):Metric {
 return metricSchema.parse({...quota(id,label,null,null,null),hasData:value!==null,unit,amount:value});
}
function account(id:string,family:string,name:string,plan:string,email:string,metrics:Metric[]):Account {
 return accountSchema.parse({id,family,name,plan,email,metrics,enabled:true,tray:false,removable:true,apiKey:false,
  note:'独立设计示例',error:'',fetchedAt:new Date(now).toISOString(),history:[]});
}

/** Synthetic source values are Used. Only this boundary performs mode conversion. */
export function makeAccounts(scenario:Scenario,remaining:boolean,simulation:Simulation=initialSimulation):Account[] {
 if(scenario==='empty')return [];
 const session=quota('session','Session',38,18000,10800),weekly=quota('weekly','Weekly',82,604800,360000);
 let accounts=[
  account('claude-personal','claude','Claude','Pro','alex@studio.example',[session,weekly]),
  account('codex-work','codex','Codex','Plus','work@studio.example',[quota('session','Session',18,18000,11400),quota('weekly','Weekly',29,604800,194400)]),
  account('cursor-personal','cursor','Cursor','Pro','alex@studio.example',[quota('monthly','Monthly',67.4,2592000,864000),amount('extra','Extra Usage',3.25)]),
  account('deepseek-api','deepseek','DeepSeek','API','',[amount('balance','Balance',126.85,'yuan')]),
 ];
 if(scenario==='normal'||scenario==='single') {
  accounts[0].metrics=accounts[0].metrics.map((m,i)=>({...m,percent:i===0?simulation.session:simulation.weekly,
   resetsAt:simulation.elapsed===null?m.resetsAt:new Date(now+m.periodSeconds!*1000*(1-simulation.elapsed/100)).toISOString()}));
  if(scenario==='single')accounts=accounts.slice(0,1);
 }
 if(scenario==='bounds') {
  const values=[0,100,112,.4];accounts.slice(0,2).flatMap(a=>a.metrics).forEach((m,i)=>{m.percent=values[i];});
  accounts[3].metrics[0].amount=0;
 }
 if(scenario==='threshold') {
  const values=[79.6,80,80.4,20];accounts.slice(0,2).flatMap(a=>a.metrics).forEach((m,i)=>{m.percent=values[i];});
 }
 if(scenario==='missing') {
  accounts[0].metrics[0]={...session,hasData:false,percent:null};
  accounts[0].metrics[1]={...weekly,hasData:false};
  accounts[1].metrics[0]={...accounts[1].metrics[0],hasData:true,percent:null};
  accounts[1].metrics[1]={...accounts[1].metrics[1],percent:0};
  accounts[3].metrics[0].hasData=false;
  accounts[0].warning='本次没有有效读数，旧值不用于推断当前额度。';
 }
 if(scenario==='reset') {
  accounts[0].metrics[0]={...session,notStarted:true,percent:0};
  accounts[0].metrics[1]={...weekly,resetsAt:new Date(now-60000).toISOString()};
  accounts[1].metrics[0]={...accounts[1].metrics[0],periodSeconds:null,resetsAt:null,label:'Orb Usage'};
  accounts[1].metrics[1]={...accounts[1].metrics[1],resetsAt:new Date(now+604800000*2).toISOString()};
  accounts[2].metrics[0].resetsAt=null;
 }
 if(scenario==='shapes')accounts=[
  {...accounts[0],metrics:[session]},
  {...accounts[1],metrics:[...accounts[1].metrics,quota('model','Extra Model Allowance',57,604800,194400)]},
  {...accounts[0],id:'same-period',email:'models@studio.example',metrics:[quota('a','Sonnet Weekly',24,604800,194400),quota('b','Opus Weekly',67,604800,194400)]},
  {...accounts[2],id:'mixed',metrics:[session,amount('balance','Balance',-12.45),weekly]},
  {...accounts[3],metrics:[amount('balance','Balance',null,'yuan')]},
 ];
 if(scenario==='many')accounts=Array.from({length:20},(_,i)=>account(`account-${i}`,i%2?'codex':'claude',i%2?'Codex':'Claude',i%2?'Pro':'Max',
  `team-${i+1}.design-research-and-infrastructure@international-workspace.example`,[
   quota('session','Long Model Name With Separate Session Allowance',i*5,18000,8280),
   quota('weekly','独立模型额度池 · International Research Workspace Weekly',92-i*3,604800,194400),
  ]));
 if(scenario==='loading'||scenario==='error')accounts=accounts.map(a=>({...a,metrics:a.metrics.map(m=>({...m,hasData:false,percent:null,amount:null}))}));
 return accounts.map(a=>({...a,metrics:a.metrics.map(m=>({...m,percent:m.percent===null?null:remaining?100-m.percent:m.percent}))}));
}

export const clamp=(value:number)=>Math.max(0,Math.min(100,value));
export const percent=(value:number)=>`${new Intl.NumberFormat('zh-CN',{maximumFractionDigits:8,useGrouping:false}).format(value)}%`;
export function readQuota(metric:Metric,props:Pick<StudyProps,'remaining'|'now'|'missing'>) {
 const r=quotaReading({metric,...props,language:'zh-Hans'});
 const valueText=r.value===null?'—':percent(r.value);
 const warning=r.used===null?'':r.used>100?'已超额':r.used===100?'额度已用尽':r.used>=80?'接近上限':'';
 return {...r,valueText,warning,description:r.value===null?props.missing:[valueText,warning].filter(Boolean).join(' · ')};
}
export type Reading=ReturnType<typeof readQuota>;
export const meterProps=(r:Reading)=>quotaMeter(r);
export function metricAttributes(m:Metric,r:Reading) {
 return {'data-metric-id':m.id,'data-kind':'quota','data-value':r.value??'unknown','data-used':r.used??'unknown','data-tone':r.tone};
}

/** Time context is observed window metadata, never a consumption forecast. */
export function cycleOf(m:Metric,current:number) {
 if(!m.hasData)return {elapsed:null,reset:'重置时间未知',exact:null};
 if(m.notStarted)return {elapsed:null,reset:'周期尚未开始',exact:null};
 const end=m.resetsAt?Date.parse(m.resetsAt):NaN;
 if(!Number.isFinite(end))return {elapsed:null,reset:'重置时间未知',exact:null};
 const exact=new Intl.DateTimeFormat('zh-CN',{timeZone:'UTC',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false}).format(end)+' UTC';
 if(end<=current)return {elapsed:null,reset:'重置已到期，待刷新',exact};
 const span=m.periodSeconds&&m.periodSeconds>0?m.periodSeconds*1000:null;
 const elapsed=span!==null&&end-current<=span?100*(1-(end-current)/span):null;
 return {elapsed,reset:`${countdown(m.resetsAt,current)} 后重置`,exact};
}
