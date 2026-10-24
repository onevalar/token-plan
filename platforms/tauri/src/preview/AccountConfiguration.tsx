import {useEffect,useRef,useState} from 'react';
import {Pencil,Plus} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Input} from '../components/arc/input/input';
import {ConfirmMorph} from '../components/arc/confirm-morph/confirm-morph';
import {providerText} from '../providerText';
import type {Account,Send} from '../desktop';
import type {Copy} from '../copy';


export type AccountDraft={note?:string;key?:string};

export function AccountConfiguration({account:a,send,t,busy,language,draft,onDraftChange,onEditHome,focusKey=0}:{draft:AccountDraft;onDraftChange:(patch:AccountDraft)=>void;account:Account;send:Send;t:Copy;busy:boolean;language:string;onEditHome?:()=>void;focusKey?:number}) {
 const tr=(s:string)=>providerText(s,language);
 const note=draft.note??a.note,key=draft.key??'';
 // The note stays out of the way until someone wants one; an unsaved draft keeps its editor open.
 const [noteOpen,setNoteOpen]=useState(false),editingNote=noteOpen||draft.note!==undefined;
 const [keyOpen,setKeyOpen]=useState(draft.key!==undefined),keyInput=useRef<HTMLInputElement>(null);
 const [saving,setSaving]=useState<'note'|'key'|null>(null),[feedback,setFeedback]=useState<Partial<Record<'note'|'key','saved'|'failed'>>>({});
 const disabled=busy;
 const savedKey=a.apiKeyStatus==='saved'||a.apiKeyStatus==='overrideActive';
 const keyStatus=a.apiKeyStatus==='saved'?tr('Saved'):a.apiKeyStatus==='overrideActive'?tr('Custom Key'):a.apiKeyStatus==='fromEnvironment'?tr('From Your Environment'):tr('Not Set');
 useEffect(()=>{if(focusKey)setKeyOpen(true);},[focusKey]);
 useEffect(()=>{if(keyOpen)keyInput.current?.focus();},[keyOpen]);
 const edit=(field:'note'|'key',value:string)=>{onDraftChange({[field]:value});setFeedback(f=>({...f,[field]:undefined}));};
 const closeKey=()=>{onDraftChange({key:undefined});setFeedback(f=>({...f,key:undefined}));setKeyOpen(false);};
 const save=async(field:'note'|'key')=>{
  if(disabled||saving||field==='note'&&note===a.note||field==='key'&&!key.trim())return;
  setSaving(field);setFeedback(f=>({...f,[field]:undefined}));
  try{await send({method:field,accountId:a.id,value:field==='note'?note:key});onDraftChange({[field]:undefined});if(field==='note'){setFeedback(f=>({...f,note:'saved'}));setNoteOpen(false);}else{setFeedback(f=>({...f,key:undefined}));setKeyOpen(false);}}
  catch{setFeedback(f=>({...f,[field]:'failed'}));}
  finally{setSaving(null);}
 };
 return <div className="account-configuration">
  <div className="account-action-fields">
   {a.note&&!editingNote&&<div className="note-row"><div><span className="note-label">{t.note}</span><p>{a.note}</p></div></div>}
   {editingNote&&<form className="note-editor" onSubmit={e=>{e.preventDefault();void save('note');}}>
    <Input label={t.note} value={note} readOnly={disabled||!!saving} maxLength={2000} autoFocus error={feedback.note==='failed'?t.failed:undefined} onChange={e=>edit('note',e.target.value)}/>
    <div className="note-actions">
     <p className="save-status" role="status">{saving==='note'?tr('Saving…'):note!==a.note?tr('Unsaved Changes'):''}</p>
     <Button size="sm" variant="ghost" disabled={!!saving} onClick={()=>{onDraftChange({note:undefined});setNoteOpen(false);}}>{t.cancel}</Button>
     <Button size="sm" variant="secondary" type="submit" loading={saving==='note'} aria-disabled={disabled||note===a.note}>{t.save}</Button>
    </div>
   </form>}
   {feedback.note==='saved'&&!editingNote&&<p className="save-status" role="status">{t.done}</p>}
   {a.apiKey&&<div className="api-key-summary">
    <span className="api-key-name">{t.key}</span>
    <span className="api-key-status" data-state={a.apiKeyStatus}>{keyStatus}</span>
    {!keyOpen&&<Button size="sm" variant="ghost" disabled={disabled} onClick={()=>setKeyOpen(true)}>{savedKey||a.apiKeyStatus==='fromEnvironment'?tr('Replace Key'):tr('Set API Key')}</Button>}
   </div>}
   {a.apiKey&&keyOpen&&<form className="key-editor" onSubmit={e=>{e.preventDefault();void save('key');}}>
    <Input ref={keyInput} label={t.key} type="password" autoComplete="off" autoFocus value={key} readOnly={disabled||!!saving} maxLength={8192} error={feedback.key==='failed'?t.failed:undefined} onChange={e=>edit('key',e.target.value)}/>
    <div className="key-editor-actions">
     <p className="save-status" role="status">{saving==='key'?tr('Saving…'):''}</p>
     <Button size="sm" variant="ghost" disabled={!!saving} onClick={closeKey}>{t.cancel}</Button>
     <Button size="sm" variant="secondary" type="submit" loading={saving==='key'} aria-disabled={disabled||!key.trim()}>{t.save}</Button>
    </div>
   </form>}
  </div>
  <div className="account-action-row">
   {onEditHome&&<Button className="edit-home-button" size="sm" variant="secondary" disabled={disabled} onClick={onEditHome}><Pencil size={15} aria-hidden="true"/>{tr('Edit Home Display')}</Button>}
   {!editingNote&&(a.note?<Button className="note-action" size="sm" variant="secondary" disabled={disabled} onClick={()=>setNoteOpen(true)}>{tr('Edit')}</Button>:<Button className="add-note" size="sm" variant="secondary" disabled={disabled} onClick={()=>setNoteOpen(true)}><Plus size={14}/>{tr('Add Note')}</Button>)}
   {savedKey&&<ConfirmMorph className="remove-key-action" fullWidth label={t.clearKey} prompt={tr('Remove?')} confirmLabel={tr('Confirm')} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.save} disabled={disabled} onConfirm={async()=>{await send({method:'key',accountId:a.id,value:''});closeKey();}}/>}
  </div>
  {a.removable&&<section className="danger-zone">
   <ConfirmMorph fullWidth label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={disabled} onConfirm={()=>send({method:'remove',accountId:a.id})}/>
  </section>}
 </div>;
}
