import {onDestroy} from 'svelte';
import type {DesktopState,Send} from '../desktop';
import {refreshResult,type RefreshResult} from '../refreshFeedback';

type Feedback={scope:number;pending:boolean;result?:RefreshResult};
export function createRefreshFeedback(send:Send){
 let feedback=$state<Feedback|null>(null),active=false,alive=true;
 let clear:ReturnType<typeof setTimeout>|undefined;
 onDestroy(()=>{alive=false;clearTimeout(clear);});
 const refresh=async(before:DesktopState,scope:number,accountId?:string)=>{
  if(active)return;
  active=true;clearTimeout(clear);feedback={scope,pending:true};
  const visibleUntil=Date.now()+600;
  let result:RefreshResult;
  try{const after=await send({method:'refresh',accountId,force:true});if(!after)throw new Error('invalid_response');result=refreshResult(before,after,accountId);}
  catch{result={tone:'error',message:'Refresh failed. Please try again.',short:'Refresh failed'};}
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,visibleUntil-Date.now())));
  active=false;if(!alive)return;
  feedback={scope,pending:false,result};
  clear=setTimeout(()=>{feedback=null;},result.tone==='success'?3500:7000);
 };
 return {get feedback(){return feedback;},get refreshing(){return feedback?.pending??false;},refresh};
}
