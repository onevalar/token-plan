import {useState,type ReactNode} from 'react';
import {SlidersHorizontal} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {Select} from '../components/arc/select/select';
import {Switch} from '../components/arc/switch/switch';
import {SortHandle} from './SortHandle';
import {providerText} from '../providerText';
import {defaultStatistics,readStatistics,statisticsKey,moduleTitles,moduleStyles,type ModuleID,type StatisticsPreferences} from '../statisticsModel';
import './statistics.css';
export function StatisticsModules({language,range,children}:{language:string;range:string;children:(id:ModuleID,style:string)=>ReactNode}) {
 const tr=(s:string)=>providerText(s,language),[editing,setEditing]=useState(false),[error,setError]=useState('');
 const [preview,setPreview]=useState<ModuleID|null>(null);
 const [preferences,setPreferences]=useState(()=>{try{return readStatistics(localStorage.getItem(statisticsKey));}catch(e){console.error('Statistics settings could not be read',e);setError('Could not load display settings.');return defaultStatistics();}});
 const change=(next:StatisticsPreferences)=>{try{localStorage.setItem(statisticsKey,JSON.stringify(next));setPreferences(next);setError('');}catch(e){console.error('Statistics settings could not be saved',e);setError('Could not save. Try again.');}};
 if(range==='1'||range==='yesterday')return <>{children('overview',preferences.styles.overview)}{children('records','')}</>;
 return <><div className="statistics-toolbar"><h2>{tr('Detailed Statistics')}</h2><Button size="sm" variant="secondary" aria-expanded={editing} onClick={()=>setEditing(!editing)}><SlidersHorizontal size={16}/>{tr(editing?'Done':'Display Settings')}</Button></div>{error&&<p role="alert">{tr(error)}</p>}
 {editing?<><p className="statistics-caption">{tr('Choose a style to preview your records. Detailed modules apply to 7- and 30-day views.')}</p><div className="statistics-settings" data-sort-list="statistics">{preferences.order.map(id=><div className="statistics-setting" data-sort-id={id} key={id}>
 <div className="statistics-setting-head"><SortHandle id={id} label={`${tr('Drag to Reorder')} ${tr(moduleTitles[id])}`} disabled={false} onMove={target=>{const order=[...preferences.order];order.splice(order.indexOf(id),1);order.splice(preferences.order.indexOf(target as ModuleID),0,id);change({...preferences,order});}}/><strong>{tr(moduleTitles[id])}</strong><Switch aria-label={tr(moduleTitles[id])} checked={preferences.enabled[id]} onCheckedChange={enabled=>{change({...preferences,enabled:{...preferences.enabled,[id]:enabled}});setPreview(enabled?id:preview===id?null:preview);}}/></div>
 {preferences.enabled[id]&&moduleStyles[id].length>0&&<><div className="statistics-style-control"><Select label={tr('Style')} value={preferences.styles[id]} options={moduleStyles[id].map(style=>({value:style,label:tr(style)}))} onValueChange={style=>{change({...preferences,styles:{...preferences.styles,[id]:style}});setPreview(id);}}/><Button size="sm" variant="ghost" aria-expanded={preview===id} onClick={()=>setPreview(preview===id?null:id)}>{tr(preview===id?'Collapse':'Preview')}</Button></div>{preview===id&&<div className="statistics-setting-preview" aria-label={tr('Style Preview')}>{children(id,preferences.styles[id])}</div>}</>}</div>)}</div></>:<div className="statistics-modules">{preferences.order.filter(id=>preferences.enabled[id]).map(id=><section className="statistics-module" data-statistics-module={id} data-statistics-style={preferences.styles[id]} key={id}>{id!=='records'&&<h2>{tr(moduleTitles[id])}</h2>}{children(id,preferences.styles[id])}</section>)}{!preferences.order.some(id=>preferences.enabled[id])&&<p>{tr('Choose modules in Display Settings.')}</p>}</div>}</>;
}
