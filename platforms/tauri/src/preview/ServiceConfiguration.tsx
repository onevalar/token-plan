import {useState} from 'react';
import {SortHandle} from './SortHandle';
import {Ellipsis} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Switch} from '../components/arc/switch/switch';
import {ProviderLogo} from '../Dashboard';
import {providerText} from '../providerText';
import {type DesktopState,type Send} from '../desktop';
import type {Copy} from '../copy';
import {useChange} from './shared';
import {DropdownMenu} from '../components/arc/dropdown-menu/dropdown-menu';
import {ConfirmMorph} from '../components/arc/confirm-morph/confirm-morph';
import {PendingAccounts} from './PendingAccounts';
import type {useAccountSetups} from './useAccountSetups';

/** Added accounts stay here even when hidden from Home. */
export function ServiceConfiguration({platform,state,send,t,busy,language,setups,resume}:{platform:string;state:DesktopState;send:Send;t:Copy;busy:boolean;language:string;setups:ReturnType<typeof useAccountSetups>;resume:(id:string)=>void}) {
 const tr=(s:string)=>providerText(s,language),[reordering,setReordering]=useState(false),[moving,setMoving]=useState(false),[removing,setRemoving]=useState<string|null>(null);
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending||moving;
 const [previewOrder,setPreviewOrder]=useState<string[]|null>(null);
 const records=state.accounts.filter(a=>a.enabled||a.added);
 const active=previewOrder?previewOrder.flatMap(id=>records.filter(a=>a.id===id)).concat(records.filter(a=>!previewOrder.includes(a.id))):records;
 const move=async(id:string,target:string)=>{
  const next=active.find(a=>a.id===target);if(!next)return;
  const direction=state.accounts.indexOf(next)>state.accounts.findIndex(a=>a.id===id)?1:-1;
  const distance=Math.abs(state.accounts.indexOf(next)-state.accounts.findIndex(a=>a.id===id));
  const order=active.map(a=>a.id),from=order.indexOf(id),to=order.indexOf(target);order.splice(to,0,order.splice(from,1)[0]);
  setPreviewOrder(order);setMoving(true);
  try{for(let i=0;i<distance;i++)if(!await change({method:'move',accountId:id,value:direction}))break;}
  finally{setPreviewOrder(null);setMoving(false);}
 };
 return <div className="service-configuration">
  {notice}
  <div className="section-heading"><h2>{tr('My Accounts')} <span className="muted">{active.length}</span></h2>{active.length>1&&<Button size="sm" variant="ghost" onClick={()=>setReordering(!reordering)}>{tr(reordering?'Done':'Reorder')}</Button>}</div>
  <p className="group-description">{tr(platform==='macos'?'Choose which accounts appear on Home. The same order is used in the menu bar.':'Choose which accounts appear on Home. Hidden accounts stay in this list.')}</p>
  <div className="configured-accounts" data-sort-list>{active.map(a=><div className="managed-account" data-sort-id={a.id} key={a.id}><div className="configured-account">
   <div className="account-entry"><ProviderLogo family={a.family}/><span className="record-label">{a.name}{a.email&&<small>{a.email}</small>}{a.note&&<small>{a.note}</small>}</span></div>
   {reordering?<SortHandle id={a.id} label={`${tr('Drag to Reorder')} · ${a.email||a.name}`} disabled={disabled} onMove={target=>void move(a.id,target)}/>:<Switch aria-label={`${t.enabled} ${a.name} ${a.email}`} checked={a.enabled} disabled={disabled} onCheckedChange={value=>void change({method:'enabled',accountId:a.id,value})}/>}
   {!reordering&&<DropdownMenu label={`${tr('Account Actions')} · ${a.email||a.name}`} iconOnly icon={<Ellipsis size={16}/>} items={[{label:t.remove,onSelect:()=>setRemoving(a.id)}]}/>}
  </div>{removing===a.id&&<div className="subscription-remove"><p className="group-description">{t.removePrompt}</p><ConfirmMorph fullWidth label={t.remove} defaultState="confirming" prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={disabled} onCancel={()=>setRemoving(null)} onConfirm={async()=>{await send({method:'remove',accountId:a.id});setRemoving(null);}}/></div>}</div>)}</div>
  <PendingAccounts setups={setups} t={t} language={language} busy={disabled} resume={resume}/>
  {!active.length&&!setups.records.length&&<p className="empty-state">{tr('No accounts yet. Add one to start tracking your usage.')}</p>}
 </div>;
}
