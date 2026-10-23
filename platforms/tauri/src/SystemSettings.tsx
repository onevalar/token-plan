import {useEffect,useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {X} from 'lucide-react';
import {Button} from './components/arc/button/button';
import {Switch} from './components/arc/switch/switch';
import {providerText} from './providerText';
import {Group,ToggleRow} from './preview/shared';
import type {DesktopState,Send} from './desktop';
export function SystemSettings({state,send,busy}:{state:DesktopState;send:Send;busy:boolean}) {
 const [error,setError]=useState(''),[pending,setPending]=useState(false),[recording,setRecording]=useState(false);
 const [notificationsOn,setNotificationsOn]=useState(()=>state.settings.notifications.some(Boolean));
 const previous=useRef(state.settings.notifications.some(Boolean)?[...state.settings.notifications]:[true,false,false]);
 const language=state.settings.language==='system'?navigator.language:state.settings.language;
 const t=(key:string)=>providerText(key,language);
 async function capture(paused:boolean){try{await invoke('shortcut_capture',{paused});setRecording(paused);}catch{setError('This shortcut is unavailable. Choose another combination.');}}
 useEffect(()=>()=>{void invoke('shortcut_capture',{paused:false}).catch(()=>{});},[]);
 async function notifications(values:boolean[],master?:boolean) {
  setPending(true);setError('');
  try {
   if(values.some(Boolean))await send({method:'notificationPermission'});
   await send({method:'settings',value:{notifications:values}});
   if(master!==undefined)setNotificationsOn(master);
  }catch(e){setError(e instanceof Error&&e.message==='notification_failed'?'Allow TokenPlan notifications in system settings, then try again.':'Could not save. Try again.');}finally{setPending(false);}
 }
 async function shortcut(value:string){setError('');setPending(true);try{await send({method:'settings',value:{shortcut:value}});}catch{setError('This shortcut is unavailable. Choose another combination.');}finally{await capture(false);setPending(false);}}
 return <section className="settings-list">
 <Group title={t('Notifications')}>
  <ToggleRow label={t('Enable Notifications')} disabled={busy||pending} checked={notificationsOn} onCheckedChange={on=>{if(!on)previous.current=[...state.settings.notifications];void notifications(on?(previous.current.some(Boolean)?previous.current:[true,false,false]):[false,false,false],on);}}/>
  {notificationsOn&&<div className="notification-options">{['Almost Out','Cutting It Close','Will Run Out'].map((label,i)=><div className="notification-row" key={label}><Switch label={t(label)} disabled={busy||pending} checked={state.settings.notifications[i]} onCheckedChange={on=>{const values=[...state.settings.notifications];values[i]=on;void notifications(values);}}/><p className="muted">{t(['Alert when a limit drops below 10% remaining.','Alert when a limit is projected to finish with little left.','Alert when a limit is projected to finish before it resets.'][i])}</p></div>)}</div>}
 </Group>
 <Group title={t('Global Shortcut')}>
  <div className="shortcut-setting"><span>{t('Show or hide TokenPlan')}</span><div className="shortcut-controls">
   <Button size="sm" variant="secondary" className="shortcut-recorder" aria-label={t('Record Shortcut')} aria-pressed={recording} disabled={busy||pending||!state.settings.shortcutAvailable} onClick={()=>void capture(!recording)} onBlur={()=>void capture(false)} onKeyDown={e=>{
    if(!recording||e.key==='Tab')return;e.preventDefault();e.stopPropagation();
    if(e.key==='Escape'){void capture(false);return;}
    if(['Control','Shift','Alt','Meta'].includes(e.key))return;
    if(!e.ctrlKey&&!e.altKey&&!e.metaKey){setError('Use Control, Alt or Command with another key.');return;}
    const parts=[e.metaKey?'Super':'',e.ctrlKey?'Control':'',e.altKey?'Alt':'',e.shiftKey?'Shift':'',e.code].filter(Boolean);void shortcut(parts.join('+'));
   }}>{recording?t('Press Shortcut'):state.settings.shortcut||t('Record Shortcut')}</Button>
   {state.settings.shortcut&&<Button size="sm" variant="ghost" aria-label={t('Clear shortcut')} disabled={busy||pending} onClick={()=>void shortcut('')}><X size={16}/></Button>}
  </div></div>
  {!state.settings.shortcutAvailable&&<p role="status" className="group-description">{t('Global shortcuts are unavailable in this desktop session.')}</p>}
 </Group>
 {error&&<p role="alert">{t(error)}</p>}
 </section>;
}
