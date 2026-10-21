import { useCallback,useEffect,useRef,useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { desktopSchema,type DesktopState,type Request } from './desktop';
export function useDesktop() {
 const [state,setState]=useState<DesktopState|null>(null);const [pending,setPending]=useState(0);const [error,setError]=useState('');
 const alive=useRef(true);const initiallyRefreshed=useRef(false);
 const send=useCallback(async(request:Request)=>{
  setPending(n=>n+1);setError('');
  try {const data=desktopSchema.parse(await invoke('desktop_request',{request}));if(alive.current)setState(data);return data;}
  catch(e){const code=typeof e==='string'?e:'invalid_response';if(alive.current)setError(code);throw new Error(code);}
  finally {if(alive.current)setPending(n=>Math.max(0,n-1));}
 },[]);
 useEffect(()=>{
  alive.current=true;
  const stateListener=listen('desktop-state',e=>{const result=desktopSchema.safeParse(e.payload);if(result.success&&alive.current)setState(result.data);});
  const errorListener=listen<string>('desktop-error',e=>{if(alive.current)setError(e.payload);});
  void send({method:'state'}).catch(()=>{});
  return ()=>{alive.current=false;void stateListener.then(stop=>stop()).catch(()=>{});void errorListener.then(stop=>stop()).catch(()=>{});};
 },[send]);
 useEffect(()=>{if(state?.settings.autoRefresh&&!initiallyRefreshed.current){initiallyRefreshed.current=true;void send({method:'refresh'}).catch(()=>{});}},[state?.settings.autoRefresh,send]);
 return {state,send,busy:pending>0,error};
}
