import {metricSchema,type Metric} from '../../src/desktop';
import {accountsFor,now} from '../usage-candidates/data';

export const scenarios=[
 {value:'normal',label:'余额与到期权益'}, {value:'mixed',label:'不同币种与单位'},
 {value:'zero',label:'真实零值'}, {value:'negative',label:'负值与小额'},
 {value:'missing',label:'缺失与旧读数'}, {value:'long',label:'长名称与大数字'},
 {value:'many',label:'40 条到期记录'}, {value:'loading',label:'读取中'},
 {value:'error',label:'读取失败'}, {value:'empty',label:'没有余额或权益'},
];
function benefit(id:string,label:string,amount:number|null,unit:string):Metric {
 return metricSchema.parse({id,label,amount,unit,placement:'details',hasData:true,pinned:false,pinnable:false,
  percent:null,periodSeconds:null,resetsAt:null,values:[]});
}
export function accountFor(scenario:string) {
 const base=accountsFor('normal',false)[1];
 const credits=benefit('codex.credits','Credits',63000,'credits');
 credits.values=[{amount:126.85,unit:'dollars',label:''},{amount:63000,unit:'credits',label:'Credits'}];
 const resets=benefit('codex.rateLimitResets','Rate Limit Resets',3,'count');
 resets.expiries=[3,10,17].map(day=>new Date(now+day*86400000).toISOString());
 let benefits=[credits,resets];
 if(scenario==='mixed')benefits=[benefit('usd','美元余额',126.85,'dollars'),benefit('cny','人民币余额',82.34,'yuan'),benefit('units','Credits',63000,'credits')];
 if(scenario==='zero')benefits=benefits.map(m=>({...m,amount:0,values:m.values.map(v=>({...v,amount:0})),expiries:[]}));
 if(scenario==='negative')benefits=[benefit('negative','美元余额',-12.34,'dollars'),benefit('small','人民币余额',.01,'yuan')];
 if(scenario==='missing'){
  credits.hasData=false; // A stale value must not be presented as a fresh balance.
  resets.amount=null;resets.expiries=[];
 }
 if(scenario==='long'){
  credits.label='专用开发环境与长名称模型共享的 Credits 余额';
  credits.values=[{amount:123456789.01,unit:'dollars',label:''},{amount:987654321,unit:'credits',label:'Credits'}];
  resets.label='专用开发环境可用的额外限额重置权益';
 }
 if(scenario==='many')resets.expiries=Array.from({length:40},(_,i)=>new Date(now+(i+1)*86400000).toISOString());
 if(scenario==='loading'||scenario==='error')benefits=benefits.map(m=>({...m,hasData:false,expiries:[]}));
 if(scenario==='empty')benefits=[];
 return {...base,history:[],note:'此处使用虚构示例。到期日期不代表每笔金额的到期分配，也不是下一次额度重置时间。',
  metrics:[...base.metrics,...benefits],benefits};
}
