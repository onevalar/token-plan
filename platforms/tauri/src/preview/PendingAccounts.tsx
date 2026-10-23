import {Button} from '../components/arc/button/button';
import {ConfirmMorph} from '../components/arc/confirm-morph/confirm-morph';
import {ProviderLogo} from '../Dashboard';
import {providerText} from '../providerText';
import type {Copy} from '../copy';
import type {useAccountSetups} from './useAccountSetups';
export function PendingAccounts({setups,language,t,busy,resume}:{setups:ReturnType<typeof useAccountSetups>;language:string;t:Copy;busy:boolean;resume:(id:string)=>void}){
 const tr=(s:string)=>providerText(s,language);
 return <section className="pending-accounts">
  {setups.error&&<div role="alert"><p className="inline-error">{tr(setups.error)}</p><Button size="sm" variant="ghost" onClick={()=>void setups.reload().catch(()=>{})}>{tr('Try Again')}</Button></div>}
  {setups.records.length>0&&<><h2>{tr('Pending Connections')}</h2>{setups.records.map(record=><div className="pending-account" key={record.id}>
   <div className="account-entry"><ProviderLogo family={record.provider}/><span className="record-label">{record.label||(record.provider==='claude'?'Claude':'Codex')}<small>{tr('Not signed in yet')}</small></span></div>
   <code className="configuration-path">{record.directory}</code>
   <div className="pending-actions"><Button size="sm" variant="secondary" disabled={busy} onClick={()=>resume(record.id)}>{tr('Continue Setup')}</Button><ConfirmMorph label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={busy} onConfirm={()=>setups.forget(record.id)}/></div>
  </div>)}</>}
 </section>;
}
