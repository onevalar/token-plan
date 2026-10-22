import {desktopSchema,metricSchema,type Account,type Metric} from '../../src/desktop';
import fixture from '../../tests/fixtures/desktop.json';

export const now=Date.parse('2026-10-22T08:00:00Z');
export const scenarios=[
 {value:'normal',label:'常见用量'}, {value:'bounds',label:'0% / 100% / 超额'},
 {value:'threshold',label:'79.6% / 80% 告警边界'}, {value:'missing',label:'缺失与尚未开始'},
 {value:'shapes',label:'单项 / 三项 / 同周期 / 金额'},
 {value:'loading',label:'读取中'}, {value:'error',label:'读取失败'}, {value:'empty',label:'没有账号'},
 {value:'many',label:'多账号与长名称（40 项）'},
];
const base=desktopSchema.parse(fixture).accounts[0];
function quota(id:string,label:string,percent:number|null,seconds:number|null,resetIn:number|null):Metric {
 return metricSchema.parse({id,label,percent,periodSeconds:seconds,placement:'home',pinned:false,pinnable:true,
  hasData:percent!==null,unit:'percent',amount:null,values:[],resetsAt:resetIn===null?null:new Date(now+resetIn*1000).toISOString()});
}
const balance=metricSchema.parse({...quota('balance','Balance',null,null,null),hasData:true,unit:'yuan',amount:126.85});
export function accountsFor(scenario:string,remaining:boolean):Account[] {
 if(scenario==='empty')return [];
 let accounts:Account[]=[
  {...base,id:'claude',family:'claude',name:'Claude',plan:'Pro',email:'first@example.com',history:[],metrics:[quota('session','Session',38,18000,10800),quota('weekly','Weekly',82,604800,360000)]},
  {...base,id:'codex',family:'codex',name:'Codex',plan:'Pro',email:'work@example.com',history:[],metrics:[quota('session','Session',18,18000,11400),quota('weekly','Weekly',29,604800,194400)]},
  {...base,id:'deepseek',family:'deepseek',name:'DeepSeek',plan:'API',email:'',history:[],metrics:[balance]},
 ];
 if(scenario==='bounds'){
  accounts[0].metrics[0].percent=0;accounts[0].metrics[1].percent=100;
  accounts[1].metrics[0].percent=112;accounts[1].metrics[1].percent=.4;
 }
 if(scenario==='threshold'){
  const values=[79.6,80,80.4,20];accounts.slice(0,2).flatMap(a=>a.metrics).forEach((m,i)=>{m.percent=values[i];});
 }
 if(scenario==='missing'){
  accounts[0].metrics[0].percent=0;accounts[0].metrics[0].notStarted=true;
  accounts[0].metrics[1].hasData=false;accounts[0].metrics[1].percent=null;
  accounts[1].metrics[0].hasData=false; // Stale non-null reading is still missing.
  accounts[1].metrics[1].periodSeconds=null;accounts[1].metrics[1].resetsAt=null;accounts[1].metrics[1].label='Orb Usage';
 }
 if(scenario==='loading'||scenario==='error')accounts=accounts.map(a=>({...a,metrics:a.metrics.map(m=>({...m,hasData:false,percent:null}))}));
 if(scenario==='shapes')accounts=[
  {...accounts[0],metrics:[accounts[0].metrics[0]]},
  {...accounts[1],metrics:[...accounts[1].metrics,quota('model','Extra Model Allowance',46,604800,194400)]},
  {...accounts[0],id:'same-period',email:'same-period@example.com',metrics:[quota('a','Model A',24,18000,7200),quota('b','Model B',67,18000,8100)]},
  {...accounts[1],id:'mixed',email:'mixed@example.com',metrics:[accounts[1].metrics[0],balance,accounts[1].metrics[1]]},
 ];
 if(scenario==='many')accounts=Array.from({length:20},(_,i)=>({
  ...accounts[i%2],id:`sample-${i}`,email:`account-${i+1}.with.a.long.address@example.com`,
  metrics:[quota('session','Long Model Name With Separate Session Allowance',i*5,18000,8280),quota('weekly','Weekly',92-i*3,604800,194400)],
 }));
 // Synthetic source is Used. Simulate the real helper's mode conversion exactly once.
 return accounts.map(a=>({...a,metrics:a.metrics.map(m=>({...m,percent:m.percent===null?null:remaining?100-m.percent:m.percent}))}));
}
