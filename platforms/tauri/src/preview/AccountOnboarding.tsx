import {useState} from 'react';
import {invoke} from '@tauri-apps/api/core';
import {Check} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {providerText} from '../providerText';
import {connectionSummary} from '../connection';
import type {Account,Send} from '../desktop';

type Guide={command:string;directory:string;opened:boolean};
/**
 * Connects another Claude or Codex login. `family` is set when it is shown inside an existing account (the service is then fixed);
 * without it the person picks the service here. Signing in always happens in the official CLI, in a separate configuration folder
 * so the current login is never replaced.
 */
export function AccountOnboarding({send,busy,language,family,targetId}:{send:Send;busy:boolean;language:string;family?:string;targetId?:string}) {
 const tr=(s:string)=>providerText(s,language);
 const [provider,setProvider]=useState(family==='codex'?'codex':'claude');
 const [pending,setPending]=useState(false),[status,setStatus]=useState(''),[error,setError]=useState('');
 const [guide,setGuide]=useState<Guide|null>(null),[advanced,setAdvanced]=useState(false),[directory,setDirectory]=useState('');
 const [results,setResults]=useState<Account[]|null>(null),[copied,setCopied]=useState(false);
 const disabled=busy||pending;
 const run=async(action:()=>Promise<void>)=>{
  setPending(true);setError('');setStatus('');
  try{await action();}catch(e){console.error('Account connection step failed',e);setError(tr(String(e).includes('invalid_directory')?'Directory not found or inaccessible. Check the full path and permissions.':'Could not complete this step. Check the directory or login and try again.'));}finally{setPending(false);}
 };
 const scan=async()=>{
  const state=await send({method:'discover'});
  if(!state)throw new Error('missing_detection_result');
  const rows=state.accounts.filter(a=>a.family===provider&&(a.email||a.removable||a.error||a.fetchedAt));
  setResults(rows);setStatus(tr(rows.length?'Detection complete.':'No matching account was identified. Check the directory and access permissions.'));
 };
 const detect=()=>run(scan);
 const pick=(value:string)=>{setProvider(value);setGuide(null);setError('');setStatus('');setResults(null);};
 return <section className="account-onboarding" aria-label={tr('Connect Account')}>
  <p className="group-description">{tr(family?'Saved accounts stay here. Detect existing logins first; only sign in again when authorization is required.':'Use this to track a second or third Claude or Codex account. TokenPlan opens a terminal with its own login folder, so the account you are already using stays signed in.')}</p>
  {!family&&<div className="segments service-picker" role="group" aria-label={tr('Login Service')}>
   {[['claude','Claude'],['codex','Codex']].map(([value,label])=><Button key={value} size="sm" variant={provider===value?'secondary':'ghost'} aria-pressed={provider===value} disabled={disabled} onClick={()=>pick(value)}>{label}</Button>)}
  </div>}
  {!guide&&<div className="onboarding-actions">
   <Button size="sm" variant="secondary" disabled={disabled} onClick={()=>void run(async()=>{setCopied(false);setGuide(await invoke<Guide>('account_login',{provider}));})}>{tr('Open Terminal to Sign In')}</Button>
   <Button size="sm" variant="ghost" disabled={disabled} onClick={()=>void detect()}>{pending?tr('Working…'):tr('Check for Existing Logins')}</Button>
  </div>}
  {guide&&<ol className="login-steps">
   <li>
    <span>{tr(guide.opened?'Finish signing in inside the terminal window that opened.':'A terminal could not be opened. Copy this command and run it in your own terminal.')}</span>
    <code className="login-command">{guide.command}</code>
    <Button size="sm" variant="ghost" disabled={disabled} onClick={()=>void run(async()=>{await navigator.clipboard.writeText(guide.command);setCopied(true);})}>{copied?<><Check size={14}/>{tr('Copied')}</>:tr('Copy Login Command')}</Button>
    <small>{tr('Install the official command-line tool first if the command is not available.')}</small>
   </li>
   <li><span>{tr('Come back here and check for the new account.')}</span>
    <div className="onboarding-actions"><Button size="sm" variant="secondary" disabled={disabled} onClick={()=>void detect()}>{pending?tr('Working…'):tr('I Have Signed In — Check Again')}</Button><Button size="sm" variant="ghost" disabled={disabled} onClick={()=>{setGuide(null);setStatus('');}}>{tr('Start Over')}</Button></div>
   </li>
  </ol>}
  <Button size="sm" variant="ghost" className="advanced-toggle" disabled={disabled} aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}>{tr('Advanced: Use an Existing Folder')}</Button>
  {advanced&&<form onSubmit={e=>{e.preventDefault();void run(async()=>{await invoke('account_directory',{provider,directory});await scan();});}}>
   <Input label={tr('Configuration Directory')} value={directory} disabled={disabled} onChange={e=>setDirectory(e.target.value)}/>
   <p className="group-description">{tr('Enter the full directory path, not a credential or token file.')}</p>
   <Button size="sm" variant="secondary" type="submit" disabled={disabled||!directory.trim()}>{tr('Connect and Detect')}</Button>
  </form>}
  {status&&<p className="group-description" role="status">{status}</p>}
  {results&&<ul className="detection-results" aria-label={tr('Detection Results')}>{results.map(a=><li key={a.id}><strong>{a.email||a.name}{a.id===targetId?' · '+tr('Current Account'):''}</strong><span>{tr(connectionSummary(a))}</span>{(a.error||a.warning)&&<small>{tr(a.error||a.warning||"")}</small>}</li>)}</ul>}
  {error&&<p className="inline-error" role="alert">{error}</p>}
 </section>;
}
