import {onMount} from 'svelte';
import {invoke} from '@tauri-apps/api/core';
import {listen} from '@tauri-apps/api/event';
import {desktopSchema,type DesktopState,type Request} from '../desktop';

/** The existing native request/event contract, with Svelte-owned lifetime. */
export function createDesktop(){
 let state=$state<DesktopState|null>(null),pending=$state(0),error=$state('');
 let alive=true,initiallyRefreshed=false;
 const send=async(request:Request)=>{
  pending++;error='';
  try{const data=desktopSchema.parse(await invoke('desktop_request',{request}));if(alive)state=data;return data;}
  catch(e){const code=typeof e==='string'?e:'invalid_response';if(alive)error=code;throw new Error(code);}
  finally{if(alive)pending=Math.max(0,pending-1);}
 };
 onMount(()=>{
  const stateListener=listen('desktop-state',event=>{const result=desktopSchema.safeParse(event.payload);if(result.success&&alive)state=result.data;});
  const errorListener=listen<string>('desktop-error',event=>{if(alive)error=event.payload;});
  void send({method:'state'}).catch(()=>{});
  return()=>{alive=false;void stateListener.then(stop=>stop()).catch(()=>{});void errorListener.then(stop=>stop()).catch(()=>{});};
 });
 $effect(()=>{if(state?.settings.autoRefresh&&!initiallyRefreshed){initiallyRefreshed=true;void send({method:'refresh'}).catch(()=>{});}});
 return {get state(){return state;},get busy(){return pending>0;},get error(){return error;},send};
}
