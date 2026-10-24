import {useRef,useState} from 'react';
import {SortHandle} from './SortHandle';
import {Select} from '../components/arc/select/select';
import {metricName} from '../Metrics';
import {providerText} from '../providerText';
import type {Account,Metric,Send} from '../desktop';
import type {Copy} from '../copy';
import {Group} from './shared';
import {UsageStylePicker} from './UsageStylePicker';
import type {useHomeUsageStyle} from './useHomeUsageStyle';

type Placement=Pick<Metric,'id'|'placement'>;
const layoutOf=(rows:Metric[]):Placement[]=>rows.map(({id,placement})=>({id,placement}));

/** Every change is applied at once; a rejected layout restores the last one the helper accepted. */
export function HomeMetricEditor({account,send,t,busy,language,usageStylePreference}:{usageStylePreference:ReturnType<typeof useHomeUsageStyle>;account:Account;send:Send;t:Copy;busy:boolean;language:string}) {
 const tr=(s:string)=>providerText(s,language);
 const [rows,setRows]=useState(()=>account.metrics.map(m=>({...m}))),[error,setError]=useState('');
 const rowsRef=useRef(rows),accepted=useRef<Placement[]>(layoutOf(rows)),pending=useRef<Metric[]|null>(null),running=useRef(false);
 const disabled=busy;
 const apply=(next:Metric[])=>{
  rowsRef.current=next;setRows(next);setError('');pending.current=next;
  if(running.current)return;
  running.current=true;
  void (async()=>{
   try{
    while(pending.current){
     const current=pending.current;pending.current=null;
     try{
      await send({method:'metricLayout',accountId:account.id,value:layoutOf(current)});
      accepted.current=layoutOf(current);
     }catch{
      // A newer choice arrived while this request was in flight: keep it and send it next.
      if(!pending.current){
       const latest=new Map(rowsRef.current.map(row=>[row.id,row]));
       const restored=accepted.current.map(({id,placement})=>{const row=latest.get(id);return row?{...row,placement}:null;}).filter((row):row is Metric=>row!==null);
       rowsRef.current=restored;setRows(restored);setError(t.failed);
       break;
      }
     }
    }
   }finally{running.current=false;}
  })();
 };
 const move=(id:string,target:string)=>{
  const next=[...rowsRef.current],from=next.findIndex(m=>m.id===id),to=next.findIndex(m=>m.id===target);
  if(from<0||to<0||from===to)return;
  next.splice(to,0,next.splice(from,1)[0]);apply(next);
 };
 const place=(id:string,placement:Metric['placement'])=>apply(rowsRef.current.map(row=>row.id===id?{...row,placement}:row));
 return <div className="home-metric-editor" tabIndex={-1} aria-label={tr('Home Display')}>
  {usageStylePreference.mode==='custom'&&<UsageStylePicker language={language} value={usageStylePreference.styleFor(account.id)} onChange={style=>usageStylePreference.changeAccountStyle(account.id,style)} tr={tr} disabled={disabled}/>}
  <Group title={tr('Home Display')}>
   <div data-sort-list>{rows.map(m=><div className="placement-row metric-edit-row" data-tray="false" data-sort-id={m.id} key={m.id}>
    <span>{metricName(m,language)}</span>
    <div className="visually-labelled-select"><Select label={`${metricName(m,language)} · ${t.placement}`} value={m.placement} disabled={disabled} options={(['home','details','hidden'] as const).map(value=>({value,label:t[value]}))} onValueChange={placement=>place(m.id,placement as Metric['placement'])}/></div>
    <SortHandle id={m.id} label={`${tr('Drag to Reorder')} · ${metricName(m,language)}`} disabled={disabled} onMove={target=>move(m.id,target)}/>

   </div>)}</div>
  </Group>
  {error&&<p role="alert" className="inline-error">{error}</p>}
 </div>;
}
