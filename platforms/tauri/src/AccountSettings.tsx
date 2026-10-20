import {useEffect,useState} from 'react';
import {Button} from './components/arc/button/button';
import {Switch} from './components/arc/switch/switch';
import {Select} from './components/arc/select/select';
import {Input} from './components/arc/input/input';
import {ConfirmMorph} from './components/arc/confirm-morph/confirm-morph';
import type {Account,Send} from './desktop';
import {providerText} from './providerText';
import type {Copy} from './copy';
export function AccountSettings({account:a,send,t,busy,language}:{account:Account;send:Send;t:Copy;busy:boolean;language:string}) {
 const [key,setKey]=useState('');const [note,setNote]=useState(a.note);
 useEffect(()=>{setKey('');setNote(a.note);},[a.id,a.note]);
 const apply=(method:string,value:unknown)=>send({method,accountId:a.id,value});
 return <section className="settings-list">
  <Switch label={t.enabled} checked={a.enabled} disabled={busy} onCheckedChange={value=>{void apply('enabled',value).catch(()=>{});}}/>
  <Switch label={t.tray} checked={a.tray} disabled={busy} onCheckedChange={value=>{void apply('tray',value).catch(()=>{});}}/>
  <div className="metric-settings">{a.metrics.map(m=><div className="metric-setting" key={m.id}>
   <h3>{providerText(m.label,language)}</h3>
   <Select label={t.placement} value={m.placement} disabled={busy} options={(['home','details','hidden'] as const).map(value=>({value,label:t[value]}))} onValueChange={placement=>{void send({method:'metric',accountId:a.id,metricId:m.id,value:{placement}}).catch(()=>{});}}/>
   <Switch label={t.pin} checked={m.pinned} disabled={busy||!m.pinnable||(!m.pinned&&a.metrics.filter(x=>x.pinned).length>=2)} onCheckedChange={pinned=>{void send({method:'metric',accountId:a.id,metricId:m.id,value:{pinned}}).catch(()=>{});}}/>
  </div>)}</div>
  <p className="muted">{t.pin_limit}</p>
  <form onSubmit={e=>{e.preventDefault();void apply('note',note).catch(()=>{});}}><Input label={t.note} value={note} maxLength={2000} onChange={e=>setNote(e.target.value)}/><Button type="submit" disabled={busy}>{t.save}</Button></form>
  {a.apiKey&&<form onSubmit={e=>{e.preventDefault();void apply('key',key).then(()=>setKey('')).catch(()=>{});}}>
   <Input label={t.key} type="password" autoComplete="off" value={key} maxLength={8192} onChange={e=>setKey(e.target.value)}/>
   <Button type="submit" disabled={busy||!key.trim()}>{t.save}</Button>
   <ConfirmMorph label={t.clearKey} confirmLabel={t.clearKey} cancelLabel={t.cancel} pendingLabel={t.save} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.save} onConfirm={()=>apply('key','')}/>
  </form>}
  {a.removable&&<ConfirmMorph label={t.remove} prompt={t.removePrompt} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={t.remove} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={busy} onConfirm={()=>send({method:'remove',accountId:a.id})}/>}
 </section>;
}
