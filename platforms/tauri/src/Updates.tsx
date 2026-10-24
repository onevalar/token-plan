import {useState,useEffect,useRef,useCallback} from 'react';
import {check,type Update} from '@tauri-apps/plugin-updater';
import {relaunch} from '@tauri-apps/plugin-process';
import {providerText} from './providerText';
import {Button} from './components/arc/button/button';
import {Switch} from './components/arc/switch/switch';
import type {Copy} from './copy';
const skippedKey='tokenplan.updates.skippedVersion';
const readSkipped=()=>{try{return localStorage.getItem(skippedKey)??'';}catch{return '';}};
const rememberSkipped=(version:string)=>{try{localStorage.setItem(skippedKey,version);}catch{/* Ask again next launch. */}};
export function useUpdater(automatic:boolean) {
 const update=useRef<Update|null>(null),alive=useRef(true),running=useRef(false);
 const [status,setStatus]=useState<'preview'|'idle'|'checking'|'available'|'latest'|'installing'|'checkError'|'installError'>('idle');
 const [version,setVersion]=useState(''),[progress,setProgress]=useState<number|null>(null),[skippedVersion,setSkippedVersion]=useState(readSkipped);
 const checkNow=useCallback(async(background=false)=>{
  if(import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1'){setStatus('preview');return;}
  if(running.current)return;running.current=true;
  if(!background)setStatus('checking');
  try {
   const next=await check({timeout:30_000});
   if(!alive.current){await next?.close();return;}
   await update.current?.close();update.current=next;
   setVersion(next?.version??'');setStatus(next?'available':'latest');
  } catch {if(alive.current&&!background)setStatus('checkError');}
  finally {running.current=false;}
 },[]);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;void update.current?.close();};},[]);
 useEffect(()=>{
  if(!automatic)return;
  const start=setTimeout(()=>{void checkNow(true);},10_000);
  const timer=setInterval(()=>{void checkNow(true);},3_600_000);
  return()=>{clearTimeout(start);clearInterval(timer);};
 },[automatic,checkNow]);
 const install=async()=>{
  if(import.meta.env.VITE_MAC_NAVIGATION_PREVIEW==='1')return;
  if(!update.current||running.current)return;running.current=true;setStatus('installing');setProgress(null);
  let total:number|undefined,downloaded=0;
  try {
   await update.current.downloadAndInstall(event=>{
    if(event.event==='Started')total=event.data.contentLength;
    else if(event.event==='Progress'){downloaded+=event.data.chunkLength;if(alive.current)setProgress(total?Math.min(100,downloaded/total*100):null);}
   });
   await relaunch();
  } catch {if(alive.current)setStatus('installError');}
  finally {running.current=false;}
 };
 const skip=useCallback(()=>{
  if(!version)return;
  rememberSkipped(version);setSkippedVersion(version);
 },[version]);
 return {status,version,progress,skipped:version!==''&&skippedVersion===version,checkNow,install,skip};
}
export function Updates({t,updater:u,automatic,onAutomatic,showHeading=true}:{showHeading?:boolean;t:Copy;updater:ReturnType<typeof useUpdater>;automatic:boolean;onAutomatic:(value:boolean)=>void}) {
 return <section className="settings-list">{showHeading&&<h2>{t.checkUpdates}</h2>}
  <Switch label={t.autoUpdates} checked={automatic} onCheckedChange={onAutomatic}/>
  <p role="status">{u.status==='preview'?providerText('Updates are disabled in the design preview.',document.documentElement.lang||navigator.language):u.status==='available'?u.skipped?t.skippedVersion:`${t.updateAvailable} ${u.version}`:u.status==='checking'?t.updateCheck:u.status==='latest'?t.latest:u.status==='checkError'?t.checkError:u.status==='installError'?t.installError:u.status==='installing'?t.installing:''}</p>
  {u.status==='installing'&&<progress aria-label={t.installing} max={100} value={u.progress??undefined}/>}
  <div className="update-actions">
   <Button loading={u.status==='checking'} disabled={u.status==='installing'} onClick={()=>{void u.checkNow();}}>{t.checkUpdates}</Button>
   {(u.status==='available'||u.status==='installError')&&<Button onClick={()=>{void u.install();}}>{t.install}</Button>}
   {u.status==='available'&&!u.skipped&&<Button variant="secondary" onClick={u.skip}>{t.skipVersion}</Button>}
  </div>
 </section>;
}
