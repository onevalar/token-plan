import {useEffect,useState} from 'react';
import {z} from 'zod';
import {accountSchema,type Account} from '../desktop';
const key='tokenplan.quotaSamples.v1';
const schema=z.record(z.string(),z.object({identity:z.string(),points:accountSchema.shape.observations}));
export type QuotaSamples=z.infer<typeof schema>;
export function collectQuotaSamples(saved:QuotaSamples,accounts:Account[],now=Date.now()):QuotaSamples {
 const next:QuotaSamples={};
 for(const a of accounts){
  const identity=a.email.trim().toLowerCase(),old=saved[a.id];
  let points=old?.identity===identity?old.points.filter(p=>Date.parse(p.date)>=now-30*86400000&&Date.parse(p.date)<=now):[];
  const time=Date.parse(a.fetchedAt);
  if(!a.error&&(!a.connection||a.connection==='available')&&Number.isFinite(time)&&time<=now&&time>=now-30*86400000){
   for(const m of a.metrics){if(!m.hasData||m.percent==null||!Number.isFinite(m.percent)||m.percent<0||m.chart.length)continue;
    const point={date:a.fetchedAt,label:m.label,value:m.percent,unit:'percent'};
    // Retain one real reading per hour and metric; don't relabel stale data with the current time.
    const hour=Math.floor(time/3600000),prior=points.find(p=>p.label===m.label&&p.unit==='percent'&&Math.floor(Date.parse(p.date)/3600000)===hour);
    if(prior&&Date.parse(prior.date)>time)continue;
    points=points.filter(p=>p!==prior);points.push(point);
   }
  }
  next[a.id]={identity,points:points.sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(-2400)};
 }
 return next;
}
export function withQuotaSamples(accounts:Account[],saved:QuotaSamples):Account[]{return accounts.map(a=>{
 const local=saved[a.id]?.identity===a.email.trim().toLowerCase()?saved[a.id].points:[];
 const points=new Map(local.map(p=>[JSON.stringify([p.date,p.label,p.unit]),p]));
 for(const p of a.observations)points.set(JSON.stringify([p.date,p.label,p.unit]),p);
 return {...a,observations:[...points.values()]};
});}
export function useQuotaSamples(accounts:Account[]|undefined){
 const [error,setError]=useState(''),[saved,setSaved]=useState<QuotaSamples>(()=>{try{const raw=localStorage.getItem(key);return raw?schema.parse(JSON.parse(raw)):{};}catch(e){console.error('Quota samples could not be read',e);setError('Could not load quota samples.');return {};}});
 useEffect(()=>{if(!accounts)return;const next=collectQuotaSamples(saved,accounts);if(JSON.stringify(next)===JSON.stringify(saved))return;
  try{localStorage.setItem(key,JSON.stringify(next));setSaved(next);setError('');}catch(e){console.error('Quota samples could not be saved',e);setError('Could not save quota samples.');}
 },[accounts,saved]);
 return {accounts:withQuotaSamples(accounts??[],saved),error};
}
