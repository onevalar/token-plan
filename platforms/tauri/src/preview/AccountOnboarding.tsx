import {useEffect,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import {Input} from '../components/arc/input/input';
import {providerText} from '../providerText';
import type {Send} from '../desktop';

type Guide={command:string;directory:string;opened:boolean};
export function AccountOnboarding({send,busy,language,family}:{send:Send;busy:boolean;language:string;family?:string}) {
 const tr=(s:string)=>providerText(s,language);
 const [provider,setProvider]=useState(family==='codex'?'codex':'claude');
 const [pending,setPending]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [guide,setGuide]=useState<Guide|null>(null),[advanced,setAdvanced]=useState(false),[directory,setDirectory]=useState('');
 const disabled=busy||pending;
 const run=async(action:()=>Promise<void>)=>{
  setPending(true);setError('');setStatus('');
  try{await action();}catch{setError(tr('Could not complete this step. Check the directory or login and try again.'));}finally{setPending(false);}
 };
 const detect=()=>run(async()=>{await send({method:'discover'});setStatus(tr('Detection complete. Choose an account below or return to its details.'));});
 useEffect(()=>{
  if(!guide)return;
  const returned=()=>{if(!busy&&!pending)void detect();};
  window.addEventListener('focus',returned);
  return()=>window.removeEventListener('focus',returned);
 },[guide,busy,pending,send]);
 return <section className="account-onboarding" aria-label={tr('Connect Account')}>
  <p className="group-description">{tr('Saved accounts stay here when a login expires. Reconnect and detect again; no restart is needed.')}</p>
  {!family&&<Select label={tr('Login Service')} value={provider} disabled={disabled} options={[{value:'claude',label:'Claude'},{value:'codex',label:'Codex'}]} onValueChange={value=>{setProvider(value);setGuide(null);setError('');setStatus('');}}/>}
  <div className="onboarding-actions">
   <Button size="sm" variant="secondary" disabled={disabled} onClick={()=>void detect()}>{pending?tr('Working…'):tr('Detect Accounts')}</Button>
   <Button size="sm" variant="ghost" disabled={disabled} onClick={()=>void run(async()=>{setGuide(await invoke<Guide>('account_login',{provider}));})}>{tr('Sign In to Another Account')}</Button>
  </div>
  {guide&&<div className="login-guide">
   <p className="group-description">{tr(guide.opened?'Complete the official login in the terminal, then detect accounts again.':'Could not open a terminal. Copy this command and run it in your terminal.')}</p>
   <p className="group-description">{tr('Uses a separate configuration directory and keeps your current login. Install the official CLI first if the command is unavailable.')}</p>
   <code className="login-command">{guide.command}</code>
   <div className="onboarding-actions"><Button size="sm" variant="ghost" disabled={disabled} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(guide.command);setStatus(tr('Copied'));})}>{tr('Copy Login Command')}</Button><Button size="sm" variant="secondary" disabled={disabled} onClick={()=>void detect()}>{tr('Login Complete — Detect Again')}</Button></div>
  </div>}
  <Button size="sm" variant="ghost" disabled={disabled} aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>{tr('Connect Existing Configuration Directory')}</Button>
  {advanced&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{await invoke('account_directory',{provider,directory});await send({method:'discover'});setStatus(tr('Detection complete. Choose an account below or return to its details.'));});}}>
   <Input label={tr('Configuration Directory')} value={directory} disabled={disabled} onChange={e=>setDirectory(e.target.value)}/>
   <p className="group-description">{tr('Enter the full directory path, not a credential or token file.')}</p>
   <Button size="sm" variant="secondary" type="submit" disabled={disabled||!directory.trim()}>{tr('Connect and Detect')}</Button>
  </form>}
  {status&&<p className="group-description" role="status">{status}</p>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
 </section>;
}
