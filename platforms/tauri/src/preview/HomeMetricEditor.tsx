import {useRef,useState} from 'react';
import {SortHandle} from './SortHandle';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import {metricName} from '../Metrics';
import {providerText} from '../providerText';
import type {Account,Metric,Send} from '../desktop';
import type {Copy} from '../copy';
import {Group} from './shared';
import {UsageStylePicker} from './UsageStylePicker';
import type {useHomeUsageStyle} from './useHomeUsageStyle';

/** A private draft: no placement or order leaves this component until Confirm. */
export function HomeMetricEditor({account,send,t,busy,language,finish,usageStylePreference}:{usageStylePreference:ReturnType<typeof useHomeUsageStyle>;account:Account;send:Send;t:Copy;busy:boolean;language:string;finish:()=>void}) {
 const tr=(s:string)=>providerText(s,language);
 const [rows,setRows]=useState(()=>account.metrics.map(m=>({...m}))),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [style,setStyle]=useState(()=>usageStylePreference.styleFor(account.id));
 const savingRef=useRef(false);
 const disabled=busy||saving;
 const move=(id:string,target:string)=>setRows(current=>{const next=[...current],from=next.findIndex(m=>m.id===id),to=next.findIndex(m=>m.id===target);next.splice(to,0,next.splice(from,1)[0]);return next;});
 const save=async()=>{
  if(disabled||savingRef.current)return;
  savingRef.current=true;setSaving(true);setError('');
  try{const saveMetrics=()=>send({method:'metricLayout',accountId:account.id,value:rows.map(({id,placement})=>({id,placement}))});if(usageStylePreference.mode==='custom')await usageStylePreference.saveAccount(account.id,style,saveMetrics);else await saveMetrics();finish();}
  catch{setError(t.failed);}finally{savingRef.current=false;setSaving(false);}
 };
 return <form className="home-metric-editor" tabIndex={-1} aria-label={tr('Home Display')} onSubmit={e=>{e.preventDefault();void save();}}>
  {usageStylePreference.mode==='custom'&&<UsageStylePicker value={style} onChange={setStyle} tr={tr} disabled={disabled}/>}
  <Group title={tr('Home Display')}>
   <div data-sort-list>{rows.map(m=><div className="placement-row metric-edit-row" data-tray="false" data-sort-id={m.id} key={m.id}>
    <span>{metricName(m,language)}</span>
    <div className="visually-labelled-select"><Select label={`${metricName(m,language)} · ${t.placement}`} value={m.placement} disabled={disabled} options={(['home','details','hidden'] as const).map(value=>({value,label:t[value]}))} onValueChange={placement=>setRows(items=>items.map(row=>row.id===m.id?{...row,placement:placement as Metric['placement']}:row))}/></div>
    <SortHandle id={m.id} label={`${tr('Drag to Reorder')} · ${metricName(m,language)}`} disabled={disabled} onMove={target=>move(m.id,target)}/>

   </div>)}</div>
  </Group>
  {error&&<p role="alert" className="inline-error">{error}</p>}
  <div className="metric-edit-actions"><Button type="button" size="sm" variant="secondary" disabled={disabled} onClick={finish}>{t.cancel}</Button><Button type="submit" size="sm" loading={saving} disabled={disabled}>{tr('Confirm Changes')}</Button></div>
 </form>;
}
