import {useState} from 'react';
import {ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {ProviderLogo} from '../Dashboard';
import {providerText} from '../providerText';
import type {Account,DesktopState,Send} from '../desktop';
import type {Copy} from '../copy';
import {useChange} from './shared';
import {AccountOnboarding} from './AccountOnboarding';
import type {AccountSetup} from './useAccountSetups';

/** Pick a service first, then use only the connection options that service supports. */
export function AddAccount({state,send,t,busy,language,open,complete,setup,onSetupChange}:{setup?:AccountSetup;onSetupChange:()=>Promise<void>;state:DesktopState;send:Send;t:Copy;busy:boolean;language:string;open:(id:string)=>void;complete:(name:string)=>void}) {
 const tr=(s:string)=>providerText(s,language),[search,setSearch]=useState(''),[family,setFamily]=useState<string|null>(setup?.provider??null);
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const services=state.accounts.filter((a,i,all)=>all.findIndex(b=>b.family===a.family)===i);
 const selected=services.find(a=>a.family===family);
 const found=state.accounts.filter(a=>a.family===family&&!a.enabled&&!a.added);
 const label=(a:Account)=>a.email?`${a.name} · ${a.email}`:a.name;
 const hint=(a:Account)=>a.email||tr(a.apiKey?'Needs an API key':a.connection==='available'?'Detected Account':'Not detected yet');
 const add=async(a:Account)=>{
  if(!await change({method:'enabled',accountId:a.id,value:true}))return;
  if(a.apiKey)open(a.id);else complete(label(a));
 };
 return <div className="add-account">
  {notice}
  {!selected?<>
   <p className="add-intro">{tr('Choose a service to see how to connect an account.')}</p>
   {services.length>6&&<div className="service-search"><Input label={tr('Search Services')} placeholder={tr('Search')} value={search} onChange={e=>setSearch(e.target.value)}/></div>}
   <div className="configured-accounts">{services.filter(a=>a.name.toLowerCase().includes(search.toLowerCase())).map(a=><Button key={a.family} variant="ghost" className="row-button account-entry" disabled={disabled} onClick={()=>setFamily(a.family)}><ProviderLogo family={a.family}/><span className="record-label">{a.name}</span><ChevronRight size={15}/></Button>)}</div>
   {!services.some(a=>a.name.toLowerCase().includes(search.toLowerCase()))&&<p className="empty-state">{tr('No Matching Services')}</p>}
  </>:<>
   <div className="section-heading"><h2><ProviderLogo family={selected.family}/> {selected.name}</h2><Button size="sm" variant="ghost" disabled={disabled} onClick={()=>setFamily(null)}>{tr('Change Service')}</Button></div>
   <div className="configured-accounts">{found.map(a=><div className="configured-account" key={a.id}>
    <span className="account-entry"><ProviderLogo family={a.family}/><span className="record-label">{a.name}<small>{hint(a)}</small></span></span>
    <Button size="sm" variant="secondary" disabled={disabled} aria-label={`${tr(a.apiKey?'Set Up':'Add')} ${label(a)}`} onClick={()=>void add(a)}>{tr(a.apiKey?'Set Up':'Add')}</Button>
   </div>)}</div>
   {!found.length&&<p className="group-description">{tr('Existing accounts are in Subscription Management, including accounts hidden from Home.')}</p>}
   {['claude','codex'].includes(selected.family)&&<AccountOnboarding key={selected.family} setup={setup?.provider===selected.family?setup:undefined} onSetupChange={onSetupChange} family={selected.family} send={send} busy={disabled} language={language} onConnected={accounts=>{
    const added=accounts[0];if(added)complete(label(added));
   }}/>}
  </>}
 </div>;
}
