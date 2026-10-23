import {useState} from 'react';
import {ChevronRight,Plus} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import {Input} from '../components/arc/input/input';
import {ConfirmMorph} from '../components/arc/confirm-morph/confirm-morph';
import {metricName} from '../Metrics';
import {providerText} from '../providerText';
import {homeUsageStyles,type HomeUsageStyle} from '../homeUsage';
import type {Account,Send} from '../desktop';
import type {Copy} from '../copy';
import {Group,useChange} from './shared';

export type AccountDraft={note?:string;key?:string};

export function AccountConfiguration({platform,account:a,send,t,busy,language,usageStyle,openGeneral,draft,onDraftChange}:{platform:string;draft:AccountDraft;onDraftChange:(patch:AccountDraft)=>void;usageStyle:HomeUsageStyle;openGeneral:()=>void;account:Account;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language);
 const note=draft.note??a.note,key=draft.key??'';
 // The note stays out of the way until someone wants one; an unsaved draft keeps its editor open.
 const [noteOpen,setNoteOpen]=useState(false),editingNote=noteOpen||draft.note!==undefined;
 const [saving,setSaving]=useState<'note'|'key'|null>(null),[feedback,setFeedback]=useState<Partial<Record<'note'|'key','saved'|'failed'>>>({});
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const supportsTray=platform==='macos';
 const pinned=a.metrics.filter(m=>m.pinned).slice(0,3);
 const edit=(field:'note'|'key',value:string)=>{onDraftChange({[field]:value});setFeedback(f=>({...f,[field]:undefined}));};
 const save=async(field:'note'|'key')=>{
  if(disabled||saving||field==='note'&&note===a.note||field==='key'&&!key.trim())return;
  setSaving(field);setFeedback(f=>({...f,[field]:undefined}));
  try{await send({method:field,accountId:a.id,value:field==='note'?note:key});onDraftChange({[field]:undefined});setFeedback(f=>({...f,[field]:'saved'}));if(field==='note')setNoteOpen(false);}
  catch{setFeedback(f=>({...f,[field]:'failed'}));}
  finally{setSaving(null);}
 };
 return <div className="account-configuration">
  {notice}
  <p className="scope-note">{tr(`These settings only affect ${a.email?`${a.name} · ${a.email}`:a.name}.`)}</p>
  <Group title={tr('Home Metrics')}>
   <div className="metric-column-labels" data-tray="false"><span>{tr('Content')}</span><span>{tr('Location')}</span></div>
   {a.metrics.map(m=><div className="placement-row" data-tray="false" key={m.id}>
    <span>{metricName(m,language)}</span>
    <div className="visually-labelled-select"><Select label={`${metricName(m,language)} · ${t.placement}`} value={m.placement} disabled={disabled} options={(['home','details','hidden'] as const).map(value=>({value,label:t[value]}))} onValueChange={placement=>void change({method:'metric',accountId:a.id,metricId:m.id,value:{placement}})}/></div>
   </div>)}
  </Group>
  <div className="linked-settings">
   {supportsTray&&<LinkedSetting label={tr('Menu Bar')} value={!a.tray?tr('Not Shown'):pinned.length?pinned.map(m=>metricName(m,language)).join(' · '):tr('Icon Only')} action={tr('Change in General Settings')} onOpen={openGeneral}/>}
   <LinkedSetting label={tr('Home Usage Style')} value={tr(homeUsageStyles[usageStyle])} action={tr('Change in General Settings')} onOpen={openGeneral}/>
  </div>
  <Group title={tr('Account Details')}>
   {editingNote?<form className="note-editor" onSubmit={e=>{e.preventDefault();void save('note');}}>
    <Input label={t.note} value={note} readOnly={disabled||!!saving} maxLength={2000} autoFocus error={feedback.note==='failed'?t.failed:undefined} onChange={e=>edit('note',e.target.value)}/>
    <div className="note-actions">
     <p className="save-status" role="status">{saving==='note'?tr('Saving…'):feedback.note==='saved'?t.done:note!==a.note?tr('Unsaved Changes'):''}</p>
     <Button size="sm" variant="ghost" disabled={!!saving} onClick={()=>{onDraftChange({note:undefined});setNoteOpen(false);}}>{t.cancel}</Button>
     <Button size="sm" variant="secondary" type="submit" loading={saving==='note'} aria-disabled={disabled||note===a.note}>{t.save}</Button>
    </div>
   </form>:<>{a.note?<div className="note-row"><div><span className="note-label">{t.note}</span><p>{a.note}</p></div><Button size="sm" variant="ghost" onClick={()=>setNoteOpen(true)}>{tr('Edit')}</Button></div>
    :<Button className="add-note" size="sm" variant="ghost" onClick={()=>setNoteOpen(true)}><Plus size={14}/>{tr('Add Note')}</Button>}
    {feedback.note==='saved'&&<p className="save-status" role="status">{t.done}</p>}</>}
   {a.apiKey&&<form className="preference-form inline-editor" onSubmit={e=>{e.preventDefault();void save('key');}}>
    <Input label={t.key} type="password" autoComplete="off" value={key} readOnly={disabled||!!saving} maxLength={8192} error={feedback.key==='failed'?t.failed:undefined} onChange={e=>edit('key',e.target.value)}/>
    <Button size="sm" variant="secondary" type="submit" loading={saving==='key'} aria-disabled={disabled||!key.trim()}>{t.save}</Button>
    <p className="save-status" role="status">{saving==='key'?tr('Saving…'):feedback.key==='saved'?t.done:key?tr('Unsaved Changes'):''}</p>
    <div className="editor-secondary-action"><ConfirmMorph label={t.clearKey} prompt={tr('Remove?')} confirmLabel={tr('Confirm')} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.save} disabled={disabled} onConfirm={()=>send({method:'key',accountId:a.id,value:''})}/></div>
   </form>}
  </Group>
  {a.removable&&<section className="danger-zone">
   <ConfirmMorph fullWidth label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={disabled} onConfirm={()=>send({method:'remove',accountId:a.id})}/>
   <p className="group-description">{tr('Terminal login and history are kept.')}</p>
  </section>}
 </div>;
}

/** A setting owned by General Settings: shown here read-only, with a way to go and change it. */
function LinkedSetting({label,value,action,onOpen}:{label:string;value:string;action:string;onOpen:()=>void}) {
 return <div className="linked-setting"><span><span className="linked-label">{label}</span>{value}</span><Button size="sm" variant="ghost" onClick={onOpen}>{action}<ChevronRight size={14} aria-hidden="true"/></Button></div>;
}
