import {useCallback,useEffect,useRef,useState} from 'react';
import type {DesktopState,Send} from './desktop';
import {refreshResult,type RefreshResult} from './refreshFeedback';

type Feedback={scope:number;pending:boolean;result?:RefreshResult};
export function useRefreshFeedback(send:Send) {
 const [feedback,setFeedback]=useState<Feedback|null>(null);
 const active=useRef(false),alive=useRef(true),clear=useRef<ReturnType<typeof setTimeout>|undefined>(undefined);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;clearTimeout(clear.current);};},[]);
 const refresh=useCallback(async(before:DesktopState,scope:number,accountId?:string)=>{
  if(active.current)return;
  active.current=true;clearTimeout(clear.current);setFeedback({scope,pending:true});
  // Keep even a cached response perceptible without delaying the actual data update.
  const visibleUntil=Date.now()+600;
  let result:RefreshResult;
  try {
   // A press of Refresh (button, shortcut or a card's Try Again) is a manual refresh: always fetch.
   const after=await send({method:'refresh',accountId,force:true});
   if(!after)throw new Error('invalid_response');
   result=refreshResult(before,after,accountId);
  }catch {result={tone:'error',message:'Refresh failed. Please try again.',short:'Refresh failed'};}
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,visibleUntil-Date.now())));
  active.current=false;
  if(!alive.current)return;
  setFeedback({scope,pending:false,result});
  // A plain success fades quickly; anything that needs a decision stays long enough to read.
  clear.current=setTimeout(()=>setFeedback(null),result.tone==='success'?3500:7000);
 },[send]);
 return {feedback,refresh,refreshing:feedback?.pending??false};
}
