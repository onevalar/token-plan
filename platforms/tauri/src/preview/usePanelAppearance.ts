import {useEffect,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import type {DesktopState} from '../desktop';

/** Keep native material failures separate from provider refresh and preference-save errors. */
export function usePanelAppearance(platform:string,appearance:DesktopState['settings']['appearance']|undefined) {
 const [attempt,setAttempt]=useState(0),[status,setStatus]=useState({failed:false,pending:false});
 useEffect(()=>{
  if(platform!=='macos'||!appearance)return;
  let current=true;
  setStatus(previous=>({...previous,pending:true}));
  void invoke('panel_appearance',{appearance:appearance==='system'?null:appearance}).then(()=>{
   if(current)setStatus({failed:false,pending:false});
  }).catch(error=>{
   console.error('Native panel appearance could not be changed',error);
   if(current)setStatus({failed:true,pending:false});
  });
  // A late reply belongs to the previous selection, not the appearance now shown in Settings.
  return()=>{current=false;};
 },[platform,appearance,attempt]);
 return {...status,retry:()=>setAttempt(value=>value+1)};
}
