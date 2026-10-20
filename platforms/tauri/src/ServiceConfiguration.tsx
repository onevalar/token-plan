import {useState} from 'react';
import {ArrowUp,ArrowDown,Plus,ChevronRight} from 'lucide-react';
import {Button} from './components/arc/button/button';
import {Input} from './components/arc/input/input';
import {Switch} from './components/arc/switch/switch';
import {History} from './History';
import {ProviderLogo} from './Dashboard';
import {accountTitle} from './usage';
import {providerText} from './providerText';
import type {DesktopState,Send} from './desktop';
import type {Copy} from './copy';
export function ServiceConfiguration({state,send,t,language,busy,open,history}:{state:DesktopState;send:Send;t:Copy;language:string;busy:boolean;open:(id:string)=>void;history:()=>void}) {
 const [adding,setAdding]=useState(false),[search,setSearch]=useState('');
 const tr=(s:string)=>providerText(s,language);
 const act=(r:Parameters<Send>[0])=>{void send(r).catch(()=>{});};
 const visible=state.accounts.filter(a=>a.enabled),available=state.accounts.filter(a=>!a.enabled&&`${a.name} ${a.email}`.toLowerCase().includes(search.toLowerCase()));
 const [moving,setMoving]=useState(false);
 const move=async(id:string,direction:number)=>{
  const next=visible[visible.findIndex(a=>a.id===id)+direction];
  if(!next)return;
  const distance=Math.abs(state.accounts.indexOf(next)-state.accounts.findIndex(a=>a.id===id));
  setMoving(true);
  try{for(let i=0;i<distance;i++)await send({method:'move',accountId:id,value:direction});}
  catch{/* The shared request layer displays the error. */}
  finally{setMoving(false);}
 };
 return <>
  <History compact onOpen={history} synced={state.sync.enabled} accounts={state.accounts} t={t} language={language}/>
  <section className="service-settings"><div className="section-heading"><h2>{t.configure}</h2><Button size="sm" variant="secondary" disabled={busy} onClick={()=>{setAdding(!adding);if(!adding)act({method:'discover'});}}><Plus size={16}/>{tr('Add Service')}</Button></div>
   {visible.map((a,index)=>{return <div className="service-row" key={a.id}>
    <Button className="service-identity" size="sm" variant="ghost" onClick={()=>open(a.id)}><ProviderLogo family={a.family}/><span className="service-label"><strong>{a.name}</strong>{a.email&&<small>{accountTitle(a.email)}</small>}</span><ChevronRight size={14}/></Button>
    <div className="actions"><Button size="sm" variant="ghost" aria-label={`${t.up} ${a.name} ${a.email}`} disabled={busy||moving||index===0} onClick={()=>void move(a.id,-1)}><ArrowUp size={14}/></Button><Button size="sm" variant="ghost" aria-label={`${t.down} ${a.name} ${a.email}`} disabled={busy||moving||index===visible.length-1} onClick={()=>void move(a.id,1)}><ArrowDown size={14}/></Button><Switch aria-label={`${t.enabled} ${a.name} ${a.email}`} checked disabled={busy||moving} onCheckedChange={value=>act({method:'enabled',accountId:a.id,value})}/></div>
   </div>;})}
   {adding&&<section className="available-services"><div className="section-heading"><h3>{tr('Available Services')}</h3><Button size="sm" variant="ghost" onClick={()=>setAdding(false)}>{tr('Close')}</Button></div><Input label={tr('Search Services')} value={search} onChange={e=>setSearch(e.target.value)}/><div className="available-scroll">{available.map(a=><div className="service-row" key={a.id}><div className="account-identity"><ProviderLogo family={a.family}/><span>{a.name}{a.email&&<small className="email">{accountTitle(a.email)}</small>}</span></div><Switch aria-label={`${t.enabled} ${a.name} ${a.email}`} checked={false} disabled={busy} onCheckedChange={value=>act({method:'enabled',accountId:a.id,value})}/></div>)}{!available.length&&<p className="muted">{tr('No Matching Services')}</p>}</div></section>}
  </section>
 </>;
}
