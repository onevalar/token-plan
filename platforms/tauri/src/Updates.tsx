import {useState,useEffect,useRef,useCallback} from 'react';
import {check,type Update} from '@tauri-apps/plugin-updater';
import {relaunch} from '@tauri-apps/plugin-process';
import {Button} from './components/arc/button/button';
import {Switch} from './components/arc/switch/switch';
import type {Copy} from './copy';
export function useUpdater(automatic:boolean) {
 const update=useRef<Update|null>(null),alive=useRef(true),running=useRef(false);
 const [status,setStatus]=useState<'idle'|'checking'|'available'|'latest'|'installing'|'checkError'|'installError'>('idle');
 const [version,setVersion]=useState(''),[progress,setProgress]=useState<number|null>(null);
 const checkNow=useCallback(async(background=false)=>{
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
 return {status,version,progress,checkNow,install};
}
export function Updates({t,updater:u,automatic,onAutomatic}:{t:Copy;updater:ReturnType<typeof useUpdater>;automatic:boolean;onAutomatic:(value:boolean)=>void}) {
 return <section className="settings-list"><h2>{t.checkUpdates}</h2>
  <Switch label={t.autoUpdates} checked={automatic} onCheckedChange={onAutomatic}/>
  <p role="status">{u.status==='available'?`${t.updateAvailable} ${u.version}`:u.status==='checking'?t.updateCheck:u.status==='latest'?t.latest:u.status==='checkError'?t.checkError:u.status==='installError'?t.installError:u.status==='installing'?t.installing:''}</p>
  {u.status==='installing'&&<progress aria-label={t.installing} max={100} value={u.progress??undefined}/>}
  <Button loading={u.status==='checking'} disabled={u.status==='installing'} onClick={()=>{void u.checkNow();}}>{t.checkUpdates}</Button>
  {(u.status==='available'||u.status==='installError')&&<Button onClick={()=>{void u.install();}}>{t.install}</Button>}
 </section>;
}
