import {useRef,useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {Check} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {providerText} from '../providerText';
import {connectionSummary} from '../connection';
import type {Account,Send} from '../desktop';
import type {AccountSetup} from './useAccountSetups';

type Guide={command:string;directory:string;opened:boolean;setup?:AccountSetup};
export function sameLoginDirectory(a:string,b:string){
 const normalize=(s:string)=>{s=s.replaceAll('\\','/').replace(/^\/\/\?\//,'').replace(/\/$/,'');return /^[a-z]:\//i.test(s)?s.toLowerCase():s;};
 return normalize(a)===normalize(b);
}
/** A resumable account setup uses one reserved directory throughout sign-in and detection. */
export function AccountOnboarding({send,busy,language,family,targetId,loginDirectories=[],setup,onSetupChange,onConnected}:{send:Send;busy:boolean;language:string;family:string;targetId?:string;loginDirectories?:string[];setup?:AccountSetup;onSetupChange?:()=>Promise<void>;onConnected?:(accounts:Account[])=>void}) {
 const tr=(s:string)=>providerText(s,language);
 const [pending,setPending]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [guide,setGuide]=useState<Guide|null>(null),[record,setRecord]=useState(setup),[label,setLabel]=useState('');
 const [advanced,setAdvanced]=useState(false),[directory,setDirectory]=useState('');
 const [results,setResults]=useState<Account[]|null>(null),[copied,setCopied]=useState(false),[connected,setConnected]=useState(false);
 const running=useRef(false),disabled=busy||pending;
 const run=async(action:()=>Promise<void>)=>{
  if(disabled||running.current)return;running.current=true;setPending(true);setError('');setStatus('');
  try{await action();}catch(e){console.error('Account connection step failed',e);setError(tr(String(e).includes('invalid_directory')?'Directory not found or inaccessible. Check the full path and permissions.':'Could not complete this step. Check the directory or login and try again.'));}finally{running.current=false;setPending(false);}
 };
 const scan=async(expectedDirectory=guide?.directory??record?.directory)=>{
  const state=await send({method:'discover'});if(!state)throw new Error('missing_detection_result');
  const rows=state.accounts.filter(a=>a.family===family&&(a.email||a.removable||a.error||a.fetchedAt));
  const match=expectedDirectory?rows.find(a=>a.loginDirectories.some(path=>sameLoginDirectory(path,expectedDirectory))):undefined;
  setResults(expectedDirectory?(match?[match]:[]):rows);
  if(match&&targetId&&match.id!==targetId){setError(tr('Another account is currently connected. This saved account is kept; connect its configuration directory or sign in to it.'));return;}
  if(match){
   if(!match.enabled)await send({method:'enabled',accountId:match.id,value:true});
   if(record?.label&&!match.note)await send({method:'note',accountId:match.id,value:record.label});
   if(record){await invoke('account_setup_remove',{id:record.id});await onSetupChange?.();}
   setConnected(true);setStatus(tr('Account connected.'));onConnected?.([{...match,enabled:true,added:true}]);
  }else setStatus(tr(expectedDirectory?'No signed-in account was found in this folder yet. Finish signing in, then check again.':rows.length?'Detection complete.':'No matching account was identified. Check the directory and access permissions.'));
 };
 const signIn=()=>run(async()=>{
  let active=record;
  const existing=targetId?loginDirectories[0]:undefined;
  if(!active&&!existing){active=await invoke<AccountSetup>('account_setup_create',{provider:family,label});setRecord(active);await onSetupChange?.();}
  const path=active?.directory??existing!;
  await invoke('account_directory',{provider:family,directory:path});
  setCopied(false);setConnected(false);setGuide(await invoke<Guide>('account_login',{provider:family,directory:path}));
 });
 return <section className="account-onboarding" aria-label={tr('Connect Account')}>
  <p className="group-description">{tr(targetId?'Saved accounts stay here. Detect existing logins first; only sign in again when authorization is required.':'Create a separate login folder for this account. Your existing terminal login stays unchanged.')}</p>
  {!targetId&&!record&&!guide&&<Input label={tr('Account Note (Optional)')} value={label} maxLength={120} disabled={disabled} onChange={e=>setLabel(e.target.value)}/>}
  {record&&<div className="setup-directory"><span>{tr('Configuration Directory')}</span><code className="configuration-path">{record.directory}</code></div>}
  {!guide&&<div className="onboarding-actions">
   <Button size="sm" variant="secondary" disabled={disabled} loading={pending} onClick={()=>void signIn()}>{tr(record||targetId?'Open Terminal to Sign In':'Create Account and Sign In')}</Button>
   <Button size="sm" variant="ghost" disabled={disabled} onClick={()=>void run(()=>scan())}>{tr('Check for Existing Logins')}</Button>
  </div>}
  {guide&&!connected&&<ol className="login-steps"><li>
   <span>{tr(guide.opened?'Finish signing in inside the terminal window that opened.':'A terminal could not be opened. Copy this command and run it in your own terminal.')}</span>
   <code className="login-command">{guide.command}</code>
   <div className="onboarding-actions"><Button size="sm" variant="ghost" disabled={disabled} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(guide.command);setCopied(true);})}>{copied?<><Check size={14}/>{tr('Copied')}</>:tr('Copy Login Command')}</Button><Button size="sm" variant="ghost" disabled={disabled} onClick={()=>void signIn()}>{tr('Reopen Terminal')}</Button></div>
   <small>{tr('Install the official command-line tool first if the command is not available.')}</small>
  </li><li><span>{tr('Come back here and check for the new account.')}</span><Button size="sm" variant="secondary" disabled={disabled} loading={pending} onClick={()=>void run(()=>scan())}>{tr('I Have Signed In — Check Again')}</Button></li></ol>}
  {!guide&&!record&&<><Button size="sm" variant="ghost" className="advanced-toggle" disabled={disabled} aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>{tr('Advanced: Use an Existing Folder')}</Button>
   {advanced&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{await invoke('account_directory',{provider:family,directory});await scan(directory);});}}>
    <Input label={tr('Configuration Directory')} value={directory} disabled={disabled} onChange={e=>setDirectory(e.target.value)}/>
    <p className="group-description">{tr('Enter the full directory path, not a credential or token file.')}</p>
    <Button size="sm" variant="secondary" type="submit" disabled={disabled||!directory.trim()}>{tr('Connect and Detect')}</Button>
   </form>}
  </>}
  {status&&<p className="group-description" role="status">{status}</p>}
  {results&&results.length>0&&<ul className="detection-results" aria-label={tr('Detection Results')}>{results.map(a=><li key={a.id}><strong>{a.email||a.name}{a.id===targetId?' · '+tr('Current Account'):''}</strong><span>{tr(connectionSummary(a))}</span>{(a.error||a.warning)&&<small>{tr(a.error||a.warning||'')}</small>}</li>)}</ul>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
 </section>;
}
