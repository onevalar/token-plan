import {useEffect,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {Input} from './components/arc/input/input';
import {Button} from './components/arc/button/button';
import {Switch} from './components/arc/switch/switch';
import {providerText} from './providerText';
import type {DesktopState,Send} from './desktop';
export function SystemSettings({state,send,busy}:{state:DesktopState;send:Send;busy:boolean}) {
 const [error,setError]=useState('');const [pending,setPending]=useState(false);
 const language=state.settings.language==='system'?navigator.language:state.settings.language;
 const t=(key:string)=>providerText(key,language);
 async function capture(paused:boolean){try{await invoke('shortcut_capture',{paused});}catch{setError('This shortcut is unavailable. Choose another combination.');}}
 useEffect(()=>()=>{void invoke('shortcut_capture',{paused:false}).catch(()=>{});},[]);
 async function alert(index:number,on:boolean) {
  setPending(true);setError('');
  try {
   if(on)await send({method:'notificationPermission'});
   const notifications=[...state.settings.notifications];notifications[index]=on;await send({method:'settings',value:{notifications}});
  }catch(e){setError(e instanceof Error&&e.message==='notification_failed'?'Allow TokenPlan notifications in system settings, then try again.':'Could not save. Try again.');}finally{setPending(false);}
 }
 async function shortcut(value:string){setError('');setPending(true);try{await send({method:'settings',value:{shortcut:value}});}catch{setError('This shortcut is unavailable. Choose another combination.');}finally{await capture(false);setPending(false);}}
 return <section className="settings-list"><h3>{t('Notifications')}</h3>{['Almost Out','Cutting It Close','Will Run Out'].map((label,i)=><div key={label}><Switch label={t(label)} disabled={busy||pending} checked={state.settings.notifications[i]} onCheckedChange={on=>void alert(i,on)}/><p className="muted">{t(['Alert when a limit drops below 10% remaining.','Alert when a limit is projected to finish with little left.','Alert when a limit is projected to finish before it resets.'][i])}</p></div>)}
 <h3>{t('Global Shortcut')}</h3>{!state.settings.shortcutAvailable&&<p role="status">{t("Global shortcuts are unavailable in this desktop session.")}</p>}<Input label={t('Show or hide TokenPlan')} description={t('Click here and press a key with Control, Alt or Command.')} value={state.settings.shortcut} readOnly disabled={busy||pending||!state.settings.shortcutAvailable} onFocus={()=>void capture(true)} onBlur={()=>void capture(false)} onKeyDown={e=>{
  if(e.key==='Tab')return;e.preventDefault();
  if(['Control','Shift','Alt','Meta'].includes(e.key))return;
  if(!e.ctrlKey&&!e.altKey&&!e.metaKey){setError('Use Control, Alt or Command with another key.');return;}
  const parts=[e.metaKey?'Super':'',e.ctrlKey?'Control':'',e.altKey?'Alt':'',e.shiftKey?'Shift':'',e.code].filter(Boolean);void shortcut(parts.join('+'));
 }}/><Button variant="ghost" disabled={busy||pending||!state.settings.shortcut} onClick={()=>void shortcut('')}>{t('Clear shortcut')}</Button>
 {error&&<p role="alert">{t(error)}</p>}
 </section>;
}
