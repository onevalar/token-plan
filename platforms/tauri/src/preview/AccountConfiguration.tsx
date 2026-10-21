import {useState} from 'react';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import {Switch} from '../components/arc/switch/switch';
import {Input} from '../components/arc/input/input';
import {ConfirmMorph} from '../components/arc/confirm-morph/confirm-morph';
import {metricName} from '../Metrics';
import {providerText} from '../providerText';
import type {Account,Send} from '../desktop';
import type {Copy} from '../copy';
import {Group,ToggleRow,useChange} from './shared';

export function AccountConfiguration({account:a,send,t,busy,language}:{account:Account;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language);
 const [note,setNote]=useState(a.note),[key,setKey]=useState('');
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const apply=(method:string,value:unknown)=>change({method,accountId:a.id,value});
 return <div className="account-configuration">
  {notice}
  <Group title={t.placement}>
   <ToggleRow label={t.enabled} checked={a.enabled} disabled={disabled} onCheckedChange={value=>void apply('enabled',value)}/>
   <ToggleRow label={tr('Show in Menu Bar')} checked={a.tray} disabled={disabled||!a.enabled} onCheckedChange={value=>void apply('tray',value)}/>
  </Group>
  <Group title={tr('Metrics')} description={t.pin_limit}>
   <div className="metric-column-labels"><span>{tr('Content')}</span><span>{tr('Location')}</span><span>{tr('Menu Bar')}</span></div>
   {a.metrics.map(m=><div className="placement-row" key={m.id}>
    <span>{metricName(m,language)}</span>
    <div className="visually-labelled-select"><Select label={`${metricName(m,language)} · ${t.placement}`} value={m.placement} disabled={disabled} options={(['home','details','hidden'] as const).map(value=>({value,label:t[value]}))} onValueChange={placement=>void change({method:'metric',accountId:a.id,metricId:m.id,value:{placement}})}/></div>
    {m.pinnable?<Switch aria-label={`${metricName(m,language)} · ${t.pin}`} checked={m.pinned} disabled={disabled||(!m.pinned&&a.metrics.filter(x=>x.pinned).length>=2)} onCheckedChange={pinned=>void change({method:'metric',accountId:a.id,metricId:m.id,value:{pinned}})}/>:<span className="muted unavailable-pin">—</span>}
   </div>)}
  </Group>
  <Group title={tr('Account Management')}>
   <form className="preference-form inline-editor" onSubmit={async e=>{e.preventDefault();await apply('note',note);}}><Input label={t.note} value={note} maxLength={2000} onChange={e=>setNote(e.target.value)}/><Button size="sm" variant="secondary" type="submit" disabled={disabled||note===a.note}>{t.save}</Button></form>
   {a.apiKey&&<form className="preference-form inline-editor" onSubmit={async e=>{e.preventDefault();if(await apply('key',key))setKey('');}}>
    <Input label={t.key} type="password" autoComplete="off" value={key} maxLength={8192} onChange={e=>setKey(e.target.value)}/>
    <Button size="sm" variant="secondary" type="submit" disabled={disabled||!key.trim()}>{t.save}</Button>
    <div className="editor-secondary-action"><ConfirmMorph label={t.clearKey} prompt={tr('Remove?')} confirmLabel={tr('Confirm')} cancelLabel={t.cancel} pendingLabel={t.save} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.save} disabled={disabled} onConfirm={()=>send({method:'key',accountId:a.id,value:''})}/></div>
   </form>}
   {a.removable&&<div className="remove-account"><p className="group-description">{tr('Terminal login and history are kept.')}</p><div className="account-action"><ConfirmMorph label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={t.remove} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={disabled} onConfirm={()=>send({method:'remove',accountId:a.id})}/></div></div>}
  </Group>
 </div>;
}
