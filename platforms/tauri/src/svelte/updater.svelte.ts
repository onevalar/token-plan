import {onDestroy} from 'svelte';
import {check,type Update} from '@tauri-apps/plugin-updater';
import {relaunch} from '@tauri-apps/plugin-process';
const skippedKey='tokenplan.updates.skippedVersion';
const readSkipped=()=>{try{return localStorage.getItem(skippedKey)??'';}catch{return '';}};
type Status='preview'|'idle'|'checking'|'available'|'latest'|'installing'|'checkError'|'installError';

export function createUpdater(automatic:()=>boolean){
 let update:Update|null=null,alive=true,running=false;
 let status=$state<Status>('idle'),version=$state(''),progress=$state<number|null>(null),skippedVersion=$state(readSkipped());
 const checkNow=async(background=false)=>{
  if(import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'){status='preview';return;}
  if(running)return;running=true;if(!background)status='checking';
  try{
   const next=await check({timeout:30_000});
   if(!alive){await next?.close();return;}
   await update?.close();update=next;version=next?.version??'';status=next?'available':'latest';
  }catch{if(alive&&!background)status='checkError';}
  finally{running=false;}
 };
 onDestroy(()=>{alive=false;void update?.close();});
 $effect(()=>{
  if(!automatic())return;
  const start=setTimeout(()=>{void checkNow(true);},10_000),timer=setInterval(()=>{void checkNow(true);},3_600_000);
  return()=>{clearTimeout(start);clearInterval(timer);};
 });
 const install=async()=>{
  if(import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'||!update||running)return;
  running=true;status='installing';progress=null;
  let total:number|undefined,downloaded=0;
  try{
   await update.downloadAndInstall(event=>{
    if(event.event==='Started')total=event.data.contentLength;
    else if(event.event==='Progress'){downloaded+=event.data.chunkLength;if(alive)progress=total?Math.min(100,downloaded/total*100):null;}
   });
   await relaunch();
  }catch{if(alive)status='installError';}
  finally{running=false;}
 };
 const skip=()=>{if(!version)return;try{localStorage.setItem(skippedKey,version);}catch{/* Ask again next launch. */}skippedVersion=version;};
 return {get status(){return status;},get version(){return version;},get progress(){return progress;},get skipped(){return version!==''&&skippedVersion===version;},checkNow,install,skip};
}
