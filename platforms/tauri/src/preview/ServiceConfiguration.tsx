import {useState} from 'react';
import {ArrowUp,ArrowDown,ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Switch} from '../components/arc/switch/switch';
import {ProviderLogo} from '../Dashboard';
import {providerText} from '../providerText';
import type {DesktopState,Send} from '../desktop';
import type {Copy} from '../copy';
import {useChange} from './shared';

/** Added accounts stay here even when hidden from Home. */
export function ServiceConfiguration({state,send,t,busy,language,open}:{state:DesktopState;send:Send;t:Copy;busy:boolean;language:string;open:(id:string)=>void}) {
 const tr=(s:string)=>providerText(s,language),[reordering,setReordering]=useState(false),[moving,setMoving]=useState(false);
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending||moving;
 const active=state.accounts.filter(a=>a.enabled||a.added);
 const move=async(id:string,direction:number)=>{
  const next=active[active.findIndex(a=>a.id===id)+direction];if(!next)return;
  const distance=Math.abs(state.accounts.indexOf(next)-state.accounts.findIndex(a=>a.id===id));
  setMoving(true);
  try{for(let i=0;i<distance;i++)if(!await change({method:'move',accountId:id,value:direction}))break;}
  finally{setMoving(false);}
 };
 return <div className="service-configuration">
  {notice}
  <div className="section-heading"><h2>{tr('My Accounts')} <span className="muted">{active.length}</span></h2>{active.length>1&&<Button size="sm" variant="ghost" onClick={()=>setReordering(!reordering)}>{tr(reordering?'Done':'Reorder')}</Button>}</div>
  <p className="group-description">{tr('Choose which accounts appear on Home. Hidden accounts stay in this list.')}</p>
  <div className="configured-accounts">{active.map((a,index)=><div className="configured-account" key={a.id}>
   <Button variant="ghost" className="row-button account-entry" onClick={()=>open(a.id)} aria-label={`${a.name} ${a.email}`}><ProviderLogo family={a.family}/><span className="record-label">{a.name}{a.email&&<small>{a.email}</small>}</span>{!reordering&&<ChevronRight size={15}/>}</Button>
   {reordering?<div className="reorder-actions"><Button size="sm" variant="ghost" aria-label={`${t.up} ${a.name} ${a.email}`} disabled={disabled||index===0} onClick={()=>void move(a.id,-1)}><ArrowUp size={15}/></Button><Button size="sm" variant="ghost" aria-label={`${t.down} ${a.name} ${a.email}`} disabled={disabled||index===active.length-1} onClick={()=>void move(a.id,1)}><ArrowDown size={15}/></Button></div>:<Switch aria-label={`${t.enabled} ${a.name} ${a.email}`} checked={a.enabled} disabled={disabled} onCheckedChange={value=>void change({method:'enabled',accountId:a.id,value})}/>}
  </div>)}</div>
  {!active.length&&<p className="empty-state">{tr('No accounts yet. Add one to start tracking your usage.')}</p>}
 </div>;
}
