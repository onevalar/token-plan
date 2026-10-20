import { z } from 'zod';
const n = z.number().finite().nullable();
export const metricSchema = z.object({
 id:z.string(), label:z.string(), placement:z.enum(['home','details','hidden']), pinned:z.boolean(), pinnable:z.boolean(), hasData:z.boolean(),
 notStarted:z.boolean().default(false),expiries:z.array(z.string()).default([]),chart:z.array(z.object({label:z.string(),value:z.number()})).default([]),
 unit:z.string(), percent:n, amount:n, resetsAt:z.string().nullable(), periodSeconds:n,
 values:z.array(z.object({amount:z.number(),unit:z.string(),label:z.string()})),
});
export const accountSchema = z.object({
 id:z.string(), family:z.string(), name:z.string(), email:z.string(), plan:z.string(), enabled:z.boolean(), tray:z.boolean(), removable:z.boolean(), apiKey:z.boolean(),
 note:z.string(), error:z.string(), fetchedAt:z.string(), metrics:z.array(metricSchema),
 observations:z.array(z.object({date:z.string(),label:z.string(),value:n,unit:z.string().nullable()})).default([]),
 historyScope:z.enum(["device","account"]).default("account"),historyPartial:z.boolean().default(false),
 history:z.array(z.object({date:z.string(),tokens:z.number(),cost:n,models:z.array(z.object({model:z.string(),tokens:z.number(),cost:n,variants:z.array(z.object({model:z.string(),tokens:z.number(),cost:n})).default([])})).default([])})),
});
export const desktopSchema = z.object({schema:z.literal('tokenplan.desktop.v1'),accounts:z.array(accountSchema),sync:z.object({available:z.boolean(),enabled:z.boolean(),syncing:z.boolean(),error:z.string(),devices:z.array(z.object({id:z.string(),name:z.string(),current:z.boolean(),updatedAt:z.string()}))}).default({available:false,enabled:false,syncing:false,error:'',devices:[]}),settings:z.object({shortcutAvailable:z.boolean().default(true),notifications:z.tuple([z.boolean(),z.boolean(),z.boolean()]).default([false,false,false]),shortcut:z.string().default(""),showRemaining:z.boolean().default(false),appearance:z.enum(['system','light','dark']),language:z.string(),trayStyle:z.enum(['ring','percentage']),refreshMinutes:z.number(),autoRefresh:z.boolean(),autoUpdates:z.boolean().default(true)})});
export type DesktopState=z.infer<typeof desktopSchema>;
export type Account=z.infer<typeof accountSchema>;
export type Metric=z.infer<typeof metricSchema>;
export type Request={method:string;accountId?:string;metricId?:string;value?:unknown};
export type Send=(request:Request)=>Promise<void>;
export function trayAccounts(accounts:Account[]) {
 const shown=accounts.filter(a=>a.enabled&&a.tray);
 const counts=new Map<string,number>();const indices=new Map<string,number>();
 shown.forEach(a=>counts.set(a.family,(counts.get(a.family)??0)+1));
 return shown.map(a=>{const index=(indices.get(a.family)??0)+1;indices.set(a.family,index);return {...a,badge:(counts.get(a.family)??0)>1?index:null};});
}
export function historyRows(accounts:Account[],family:string) {
 const seen=new Set<string>();
 return accounts.filter(a=>family==='all'||a.family===family).flatMap(a=>{
  const owner=a.historyScope==='device'?a.family:a.id;
  if(seen.has(owner)||!a.history.length)return [];
  seen.add(owner);return a.history.map(d=>({...d,provider:a.name,account:a.historyScope==='account'?a.email:'',owner}));
 }).sort((a,b)=>b.date.localeCompare(a.date)||a.provider.localeCompare(b.provider));
}
