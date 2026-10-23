import {useState} from 'react';
import {Plus} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {ConfirmMorph} from '../components/arc/confirm-morph/confirm-morph';
import {providerText} from '../providerText';
import type {Account,Send} from '../desktop';
import type {Copy} from '../copy';


export type AccountDraft={note?:string;key?:string};

export function AccountConfiguration({account:a,send,t,busy,language,draft,onDraftChange}:{draft:AccountDraft;onDraftChange:(patch:AccountDraft)=>void;account:Account;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language);
 const note=draft.note??a.note,key=draft.key??'';
 // The note stays out of the way until someone wants one; an unsaved draft keeps its editor open.
 const [noteOpen,setNoteOpen]=useState(false),editingNote=noteOpen||draft.note!==undefined;
 const [saving,setSaving]=useState<'note'|'key'|null>(null),[feedback,setFeedback]=useState<Partial<Record<'note'|'key','saved'|'failed'>>>({});
 const disabled=busy;
 const edit=(field:'note'|'key',value:string)=>{onDraftChange({[field]:value});setFeedback(f=>({...f,[field]:undefined}));};
 const save=async(field:'note'|'key')=>{
  if(disabled||saving||field==='note'&&note===a.note||field==='key'&&!key.trim())return;
  setSaving(field);setFeedback(f=>({...f,[field]:undefined}));
  try{await send({method:field,accountId:a.id,value:field==='note'?note:key});onDraftChange({[field]:undefined});setFeedback(f=>({...f,[field]:'saved'}));if(field==='note')setNoteOpen(false);}
  catch{setFeedback(f=>({...f,[field]:'failed'}));}
  finally{setSaving(null);}
 };
 return <div className="account-configuration">
  <div className="account-action-fields">
   {editingNote?<form className="note-editor" onSubmit={e=>{e.preventDefault();void save('note');}}>
    <Input label={t.note} value={note} readOnly={disabled||!!saving} maxLength={2000} autoFocus error={feedback.note==='failed'?t.failed:undefined} onChange={e=>edit('note',e.target.value)}/>
    <div className="note-actions">
     <p className="save-status" role="status">{saving==='note'?tr('Saving…'):feedback.note==='saved'?t.done:note!==a.note?tr('Unsaved Changes'):''}</p>
     <Button size="sm" variant="ghost" disabled={!!saving} onClick={()=>{onDraftChange({note:undefined});setNoteOpen(false);}}>{t.cancel}</Button>
     <Button size="sm" variant="secondary" type="submit" loading={saving==='note'} aria-disabled={disabled||note===a.note}>{t.save}</Button>
    </div>
   </form>:<>{a.note?<div className="note-row"><div><span className="note-label">{t.note}</span><p>{a.note}</p></div><Button size="sm" variant="ghost" onClick={()=>setNoteOpen(true)}>{tr('Edit')}</Button></div>
    :<Button className="add-note" size="sm" variant="secondary" onClick={()=>setNoteOpen(true)}><Plus size={14}/>{tr('Add Note')}</Button>}
    {feedback.note==='saved'&&<p className="save-status" role="status">{t.done}</p>}</>}
   {a.apiKey&&<form className="preference-form inline-editor" onSubmit={e=>{e.preventDefault();void save('key');}}>
    <Input label={t.key} type="password" autoComplete="off" value={key} readOnly={disabled||!!saving} maxLength={8192} error={feedback.key==='failed'?t.failed:undefined} onChange={e=>edit('key',e.target.value)}/>
    <Button size="sm" variant="secondary" type="submit" loading={saving==='key'} aria-disabled={disabled||!key.trim()}>{t.save}</Button>
    <p className="save-status" role="status">{saving==='key'?tr('Saving…'):feedback.key==='saved'?t.done:key?tr('Unsaved Changes'):''}</p>
    <div className="editor-secondary-action"><ConfirmMorph label={t.clearKey} prompt={tr('Remove?')} confirmLabel={tr('Confirm')} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.save} disabled={disabled} onConfirm={()=>send({method:'key',accountId:a.id,value:''})}/></div>
   </form>}
  </div>
  {a.removable&&<section className="danger-zone">
   <ConfirmMorph fullWidth label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={disabled} onConfirm={()=>send({method:'remove',accountId:a.id})}/>
  </section>}
 </div>;
}
