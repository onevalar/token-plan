import {useState} from 'react';
import {Check} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {ProviderLogo} from '../Dashboard';
import {providerText} from '../providerText';
import type {Account,DesktopState,Send} from '../desktop';
import type {Copy} from '../copy';
import {useChange} from './shared';
import {AccountOnboarding} from './AccountOnboarding';

/**
 * One place to add accounts. First the accounts TokenPlan already found on this Mac (one press to add), then the guided way to sign in
 * to an additional Claude or Codex account. Services that need an API key open their settings right after being added.
 */
export function AddAccount({state,send,t,busy,language,open}:{state:DesktopState;send:Send;t:Copy;busy:boolean;language:string;open:(id:string)=>void}) {
 const tr=(s:string)=>providerText(s,language),[search,setSearch]=useState(''),[added,setAdded]=useState('');
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending;
 // Accounts TokenPlan recognised on this Mac come first; the rest are services that still need a sign-in or an API key.
 const detected=(a:Account)=>!!a.email||a.connection==='available';
 const found=state.accounts.filter(a=>!a.enabled).sort((a,b)=>Number(detected(b))-Number(detected(a)));
 const [tab,setTab]=useState<'existing'|'another'>(()=>found.length?'existing':'another');
 const shown=found.filter(a=>`${a.name} ${a.email}`.toLowerCase().includes(search.toLowerCase()));
 const label=(a:Account)=>a.email?`${a.name} · ${a.email}`:a.name;
 const hint=(a:Account)=>a.email||tr(a.apiKey?'Needs an API key':detected(a)?'Found on this Mac':'Not detected yet');
 const add=async(a:Account)=>{
  setAdded('');
  if(!await change({method:'enabled',accountId:a.id,value:true}))return;
  if(a.apiKey)open(a.id);else setAdded(label(a));
 };
 return <div className="add-account">
  {notice}
  <p className="add-intro">{tr('TokenPlan reads accounts that are already signed in on this Mac. Add one below, or sign in to another account.')}</p>
  <nav className="segments preview-segments add-tabs" aria-label={tr('Add Account')}>
   <Button size="sm" variant={tab==='existing'?'secondary':'ghost'} aria-pressed={tab==='existing'} onClick={()=>setTab('existing')}>{tr('Available to Add')} <span className="muted">{found.length}</span></Button>
   <Button size="sm" variant={tab==='another'?'secondary':'ghost'} aria-pressed={tab==='another'} onClick={()=>setTab('another')}>{tr('Another Account')}</Button>
  </nav>
  {tab==='existing'&&<section className="add-section">
   {found.length>6&&<div className="service-search"><Input label={tr('Search Services')} placeholder={tr('Search')} value={search} onChange={e=>setSearch(e.target.value)}/></div>}
   {added&&<p className="added-note" role="status"><Check size={14} aria-hidden="true"/>{tr('Added to Home')}: {added}</p>}
   <div className="configured-accounts">{shown.map(a=><div className="configured-account" key={a.id}>
    <span className="account-entry"><ProviderLogo family={a.family}/><span className="record-label">{a.name}<small>{hint(a)}</small></span></span>
    <Button size="sm" variant="secondary" disabled={disabled} aria-label={`${tr(a.apiKey?'Set Up':'Add')} ${label(a)}`} onClick={()=>void add(a)}>{tr(a.apiKey?'Set Up':'Add')}</Button>
   </div>)}</div>
   {!shown.length&&<p className="empty-state">{tr(found.length?'No Matching Services':'Everything found on this Mac is already added.')}</p>}
  </section>}
  {tab==='another'&&<section className="add-section">
   <div className="section-heading"><h2>{tr('Sign In to Another Account')}</h2></div>
   <AccountOnboarding send={send} busy={disabled} language={language}/>
  </section>}
 </div>;
}
