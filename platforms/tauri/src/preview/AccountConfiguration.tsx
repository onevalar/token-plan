import {useState} from 'react';
import {Plus} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import {Switch} from '../components/arc/switch/switch';
import {Input} from '../components/arc/input/input';
import {ConfirmMorph} from '../components/arc/confirm-morph/confirm-morph';
import {metricName} from '../Metrics';
import {providerText} from '../providerText';
import {TrayGlyph} from './TrayPreview';
import type {Account,DesktopState,Send} from '../desktop';
import type {Copy} from '../copy';
import {Group,ToggleRow,useChange} from './shared';

export type AccountDraft={note?:string;key?:string};

export function AccountConfiguration({account:a,send,t,busy,language,traySettings,badge,draft,onDraftChange}:{draft:AccountDraft;onDraftChange:(patch:AccountDraft)=>void;badge?:number|null;traySettings:DesktopState['settings'];account:Account;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language);
 const note=draft.note??a.note,key=draft.key??'';
 // The note stays out of the way until someone wants one; an unsaved draft keeps its editor open.
 const [noteOpen,setNoteOpen]=useState(false),editingNote=noteOpen||draft.note!==undefined;
 const [saving,setSaving]=useState<'note'|'key'|null>(null),[feedback,setFeedback]=useState<Partial<Record<'note'|'key','saved'|'failed'>>>({});
 const {pending,change,notice}=useChange(send,t),disabled=busy||pending;
 const pinned=a.metrics.filter(m=>m.pinned).slice(0,3);
 const ring=traySettings.trayStyle==='ring'&&pinned.length>0&&pinned.every(m=>m.percent!=null||m.unit==='percent');
 const apply=(method:string,value:unknown)=>change({method,accountId:a.id,value});
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
  <Group title={t.placement}>
   <ToggleRow label={t.enabled} checked={a.enabled} disabled={disabled} onCheckedChange={value=>void apply('enabled',value)}/>
   <ToggleRow label={tr('Show in Menu Bar')} checked={a.tray} disabled={disabled||!a.enabled} onCheckedChange={value=>void apply('tray',value)}/>
  </Group>
  <Group title={tr('Metrics')} description={tr('Choose up to three menu bar metrics per account.')}>
   {pinned.length>0&&<div className="account-tray-preview" aria-label={tr('Menu Bar Preview')}>
    <TrayGlyph badge={badge} family={a.family} metrics={pinned} style={traySettings.trayStyle} position={traySettings.ringIconPosition}/>
    <ol className="ring-legend">{pinned.map((m,i)=><li key={m.id}><span>{ring?tr(i===0?'Outer Ring':pinned.length===3&&i===1?'Middle Ring':'Inner Ring'):String(i+1)}</span><strong>{metricName(m,language)}</strong></li>)}</ol>
   </div>}
   {pinned.length===0&&a.tray&&<div className="empty-tray-selection"><p className="group-description" role="status">{tr(a.metrics.some(m=>m.pinnable)?'Only the icon is shown. No usage metric is selected.':'No usage metrics are available yet.')}</p>
    {a.metrics.some(m=>m.pinnable)&&<Button size="sm" variant="secondary" disabled={disabled} onClick={()=>{const metric=a.metrics.find(m=>m.pinnable);if(metric)void change({method:'metric',accountId:a.id,metricId:metric.id,value:{pinned:true}});}}>{tr('Show First Usage Metric')}</Button>}
   </div>}
   {pinned.length===3&&ring&&<p className="group-description">{tr('Three rings use the left icon layout.')}</p>}
   {pinned.length>0&&traySettings.trayStyle==='ring'&&!ring&&<p className="group-description">{tr('Metrics without a percentage are shown as values.')}</p>}
   <div className="metric-column-labels"><span>{tr('Content')}</span><span>{tr('Location')}</span><span>{tr('Menu Bar')}</span></div>
   {a.metrics.map(m=><div className="placement-row" key={m.id}>
    <span>{metricName(m,language)}</span>
    <div className="visually-labelled-select"><Select label={`${metricName(m,language)} · ${t.placement}`} value={m.placement} disabled={disabled} options={(['home','details','hidden'] as const).map(value=>({value,label:t[value]}))} onValueChange={placement=>void change({method:'metric',accountId:a.id,metricId:m.id,value:{placement}})}/></div>
    {m.pinnable?<Switch aria-label={`${metricName(m,language)} · ${t.pin}`} checked={m.pinned} disabled={disabled||(!m.pinned&&a.metrics.filter(x=>x.pinned).length>=3)} onCheckedChange={pinned=>void change({method:'metric',accountId:a.id,metricId:m.id,value:{pinned}})}/>:<span className="muted unavailable-pin">—</span>}
   </div>)}
  </Group>
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
   <ConfirmMorph label={t.remove} prompt={tr('Remove?')} confirmLabel={t.remove} cancelLabel={t.cancel} pendingLabel={tr('Removing…')} doneLabel={t.done} errorLabel={t.failed} retryLabel={t.remove} disabled={disabled} onConfirm={()=>send({method:'remove',accountId:a.id})}/>
   <p className="group-description">{tr('Terminal login and history are kept.')}</p>
  </section>}
 </div>;
}
