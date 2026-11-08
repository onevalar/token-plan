import type {Account} from '../desktop';
import {collectQuotaSamples,withQuotaSamples,quotaSamplesKey,quotaSamplesSchema,type QuotaSamples} from '../preview/useQuotaSamples';

export function createQuotaSamples(accounts:()=>Account[]|undefined){
 let error=$state('');
 const read=()=>{try{const raw=localStorage.getItem(quotaSamplesKey);return raw?quotaSamplesSchema.parse(JSON.parse(raw)):{};}catch(e){console.error('Quota samples could not be read',e);error='Could not load quota samples.';return {};}};
 let saved=$state<QuotaSamples>(read());
 $effect(()=>{
  const current=accounts();if(!current)return;
  const next=collectQuotaSamples(saved,current);if(JSON.stringify(next)===JSON.stringify(saved))return;
  try{localStorage.setItem(quotaSamplesKey,JSON.stringify(next));saved=next;error='';}
  catch(e){console.error('Quota samples could not be saved',e);error='Could not save quota samples.';}
 });
 return {get accounts(){return withQuotaSamples(accounts()??[],saved);},get error(){return error;}};
}
