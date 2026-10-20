import base from './desktop.json' with {type:'json'};
import {desktopSchema,metricSchema,type Account} from '../../src/desktop';
import {dateKey} from '../../src/historyModel';

/** Synthetic installation with two accounts, seven enabled services and a full month.
 * No local credentials, account identities or history are copied into this fixture. */
export function largeDesktop(now=new Date()) {
 const state=desktopSchema.parse(base);
 const quota=(id:string,label:string,percent:number|null,periodSeconds:number)=>metricSchema.parse({
  id,label,percent,periodSeconds,placement:'home',pinned:id==='weekly',pinnable:true,
  hasData:percent!=null,notStarted:percent===0,unit:'percent',amount:null,values:[],
  resetsAt:new Date(now.getTime()+periodSeconds*600).toISOString(),
 });
 const trend=metricSchema.parse({...quota('trend','Usage Trend',null,86400),hasData:true,pinnable:false,periodSeconds:null,
  chart:Array.from({length:30},(_,i)=>({label:String(i),value:i%4===0?10+i*3:0}))});
 const make=(family:string,name:string,plan:string,metrics:Account['metrics'],email=''):Account=>({
  ...structuredClone(state.accounts[0]),id:family,family,name,plan,email,metrics,history:[],observations:[],
 });
 state.accounts=[
  make('claude','Claude','Pro',[quota('session','Session',46,18000),quota('weekly','Weekly',92,604800)],'first@example.com'),
  {...make('claude','Claude','Pro',[quota('session','Session',0,18000),quota('weekly','Weekly',29,604800),trend,
   {...quota('fable','Fable',null,0),periodSeconds:null,placement:'details'}],'second.with.a.long.address@example.com'),id:'claude:second'},
  make('codex','Codex','Pro 200',[{...quota('session','Session',40,18000),placement:'hidden'},quota('weekly','Weekly',29,604800)]),
  make('antigravity','Antigravity','Pro',[quota('session','Session',6,18000),quota('weekly','Weekly',30,604800),quota('argon','Argon Weekly',65,604800),trend]),
  make('opencode','OpenCode','Go',[quota('session','5 Hours',20,18000),quota('weekly','Weekly',11,604800),quota('monthly','Monthly',24,2592000),{...trend,chart:[{label:'Today',value:12}]}]),
  make('amp','Amp','Megawatt',[{...quota('orb','Orb Usage',76,0),periodSeconds:null,resetsAt:null}]),
  make('deepseek','DeepSeek','',[{...quota('balance','Balance',null,0),periodSeconds:null,hasData:true,amount:126.85,unit:'yuan'}]),
 ];
 state.accounts.forEach((account,index)=>{
  account.history=Array.from({length:30},(_,day)=>{
   const date=new Date(now);date.setDate(date.getDate()-day);
   const tokens=1000000*(index+1)+day*100,cost=5*(index+1)+day/10;
   return {date:dateKey(date),tokens,cost,models:[{model:'synthetic-model',tokens,cost,variants:[]}]};
  });
  account.observations=Array.from({length:30},(_,day)=>{
   const date=new Date(now);date.setDate(date.getDate()-day);
   return {date:date.toISOString(),label:'Weekly',value:day,unit:'percent'};
  });
 });
 for(const name of ['Cursor','Copilot','Devin','Grok','Ollama','OpenRouter','MiniMax','Z.ai']){
  state.accounts.push({...make(name.toLowerCase(),name,'',[]),enabled:false,tray:false});
 }
 return state;
}
