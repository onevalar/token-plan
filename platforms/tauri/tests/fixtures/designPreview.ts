import {largeDesktop} from './largeDesktop';
import {metricSchema} from '../../src/desktop';

/** Artificial data for the native design review. Never read installed preferences or CLI credentials. */
export function designPreview() {
 const now=new Date(),state=largeDesktop(now);
 state.settings.autoRefresh=false;state.settings.autoUpdates=false;
 state.accounts.forEach((a,index)=>{
  a.fetchedAt=now.toISOString();
  a.history.forEach((r,day)=>{
   const weight=(day%7===5?0.12:day%3===0?0.85:0.42)+(29-day)/80;
   r.tokens=Math.round(r.tokens*weight);r.cost=Number(((r.cost??0)*weight).toFixed(2));
   r.models=[{model:'Example model',tokens:r.tokens,cost:r.cost,variants:[]}];
  });
  // One distinguishable capsule in the real menu bar while reviewing a synthetic installation.
  a.tray=false;
  if(index===0)a.email='alex@example.com';
  if(index===1)a.email='robin@example.com';
 });
 const codex=state.accounts.find(a=>a.family==='codex')!;
 codex.metrics.push(metricSchema.parse({...codex.metrics[0],id:'codex.credits',label:'Credits',placement:'details',hasData:true,percent:null,periodSeconds:null,unit:'count',amount:63000.375,values:[{amount:63000.375,unit:'count',label:'credits'}]}));
 codex.metrics.push(metricSchema.parse({...codex.metrics[0],id:'codex.rateLimitResets',label:'Rate Limit Resets',placement:'details',hasData:true,percent:null,periodSeconds:null,unit:'count',amount:3,values:[],expiries:[3,10,17].map(day=>new Date(now.getTime()+day*86400000).toISOString())}));
 const apiMetric=(id:string,label:string,amount:number,unit:string,placement:'home'|'details')=>metricSchema.parse({...codex.metrics[0],id,label,amount,unit,placement,percent:null,periodSeconds:null,resetsAt:null,values:[],pinned:false});
 state.accounts.push({...structuredClone(codex),id:'openai',family:'openai',name:'OpenAI API',email:'',plan:'',note:'',apiKey:true,apiKeyStatus:'notSet',removable:false,tray:false,observations:[],historyPartial:false,
  metrics:[apiMetric('openai.month','This Month',12.75,'dollars','home'),apiMetric('openai.today','Today',0.75,'dollars','details'),apiMetric('openai.tokens','Month Tokens',150000,'count','details')],
  history:codex.history.map(day=>({...day,tokens:5000,cost:0.425,models:[{model:'Example API model',tokens:5000,cost:null,variants:[]}]}))});
 const api=state.accounts.find(a=>a.id==='openai')!;
 state.accounts.push({...structuredClone(api),id:'anthropic',family:'anthropic',name:'Anthropic API',
  metrics:api.metrics.map(m=>({...m,id:m.id.replace('openai.','anthropic.')}))});
 return state;
}
