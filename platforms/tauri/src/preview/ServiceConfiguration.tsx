import {useState} from 'react';
import {ArrowUp,ArrowDown,ChevronRight} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {Switch} from '../components/arc/switch/switch';
import {ProviderLogo} from '../Dashboard';
import {providerText} from '../providerText';
import type {DesktopState,Send} from '../desktop';
import type {Copy} from '../copy';
import {useChange} from './shared';

export function ServiceConfiguration({state,send,t,busy,language,open,adding=false}:{state:DesktopState;send:Send;t:Copy;busy:boolean;language:string;open:(id:string)=>void;adding?:boolean}) {
 const tr=(s:string)=>providerText(s,language),[search,setSearch]=useState(''),[reordering,setReordering]=useState(false),[moving,setMoving]=useState(false);
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending||moving;
 const active=state.accounts.filter(a=>a.enabled);
 const available=state.accounts.filter(a=>!a.enabled&&`${a.name} ${a.email}`.toLowerCase().includes(search.toLowerCase()));
 const move=async(id:string,direction:number)=>{
  const next=active[active.findIndex(a=>a.id===id)+direction];if(!next)return;
  const distance=Math.abs(state.accounts.indexOf(next)-state.accounts.findIndex(a=>a.id===id));
  setMoving(true);
  try{for(let i=0;i<distance;i++)if(!await change({method:'move',accountId:id,value:direction}))break;}
  finally{setMoving(false);}
 };
 const rows=adding?available:active;
 return <div className="service-configuration">
  {notice}
  {adding?<div className="service-search"><Input label={tr('Search Services')} value={search} onChange={e=>setSearch(e.target.value)}/></div>:<div className="section-heading"><h2>{tr('Enabled Accounts')} <span className="muted">{active.length}</span></h2><Button size="sm" variant="ghost" onClick={()=>setReordering(!reordering)}>{tr(reordering?'Done':'Reorder')}</Button></div>}
  {!adding&&<p className="group-description">{tr('Turning off an account keeps it available in Add Service.')}</p>}
  <div className="configured-accounts">{rows.map((a,index)=><div className="configured-account" key={a.id}>
   <Button variant="ghost" className="row-button account-entry" onClick={()=>open(a.id)} aria-label={`${a.name} ${a.email}`}><ProviderLogo family={a.family}/><span className="record-label">{a.name}{a.email&&<small>{a.email}</small>}</span>{!reordering&&<ChevronRight size={15}/>}</Button>
   {!adding&&reordering?<div className="reorder-actions"><Button size="sm" variant="ghost" aria-label={`${t.up} ${a.name} ${a.email}`} disabled={disabled||index===0} onClick={()=>void move(a.id,-1)}><ArrowUp size={15}/></Button><Button size="sm" variant="ghost" aria-label={`${t.down} ${a.name} ${a.email}`} disabled={disabled||index===rows.length-1} onClick={()=>void move(a.id,1)}><ArrowDown size={15}/></Button></div>:<Switch aria-label={`${t.enabled} ${a.name} ${a.email}`} checked={a.enabled} disabled={disabled} onCheckedChange={value=>void change({method:'enabled',accountId:a.id,value})}/>}
  </div>)}</div>
  {!rows.length&&<p className="empty-state">{tr(adding?'No Matching Services':'No Enabled Accounts')}</p>}
 </div>;
}
