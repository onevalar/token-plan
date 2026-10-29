import {useRef,useState} from 'react';
import {ActivityChart,SourcesChart,QuotaChart} from './StatisticsCharts';
import {StatisticsOverview} from './StatisticsOverview';
import {StatisticsComposition} from './StatisticsComposition';
import {StatisticsTime} from './StatisticsTime';
import {StatisticsCompare} from './StatisticsCompare';
import {StatisticsBudget} from './StatisticsBudget';
import {SimpleTotals,SourceDetail} from './StatisticsShared';
import {moduleStyles,type ModuleID} from '../statisticsModel';
import type {StatisticsView,StatisticsMeasure} from '../statisticsData';
import type {Account} from '../desktop';

export function StatisticsContent({id,style,view,measure,language,accounts,scope,range}:{
 id:Exclude<ModuleID,'records'>;style:string;view:StatisticsView;measure:StatisticsMeasure;language:string;accounts:Account[];scope:string;range:string;
}) {
 const [selected,setSelected]=useState<string|null>(null),[day,onDay]=useState<string|null>(null);
 const origin=useRef<HTMLElement|SVGElement|null>(null),clicked=useRef<HTMLElement|SVGElement|null>(null);
 const close=()=>{setSelected(null);requestAnimationFrame(()=>{if(origin.current?.isConnected)origin.current.focus();});};
 const onSelect=(key:string|null)=>{
  if(key===null){close();return;}
  // SVG marks and native buttons both return focus to the exact activated control.
  origin.current=clicked.current??document.activeElement as HTMLElement|SVGElement|null;
  clicked.current=null;setSelected(key);
 };
 const index=(moduleStyles[id] as readonly string[]).indexOf(style);
 const props={view,measure,language,selected,onSelect,day,onDay,variant:index};
 const detailsMeasure=id==='budget'?'cost':measure;
 return <div className="statistics-design" onClickCapture={event=>{
  if(event.target instanceof Element){const target=event.target.closest<HTMLElement|SVGElement>('button,[role="button"]');if(target&&!target.closest('.tp-source-detail'))clicked.current=target;}
 }} onKeyDownCapture={()=>{clicked.current=null;}}>
  {id==='overview'?(index===0?<SimpleTotals view={view} language={language}/>:<StatisticsOverview {...props} variant={index-1}/>):
   id==='activity'?(index<3?<ActivityChart view={view} measure={measure} language={language} style={style}/>:<StatisticsTime {...props} variant={index-3}/>):
   id==='sources'?(index<2?<SourcesChart view={view} measure={measure} language={language} style={style}/>:<StatisticsComposition {...props} variant={index-2}/>):
   id==='comparison'?<StatisticsCompare {...props}/>:
   id==='budget'?<StatisticsBudget {...props} measure="cost" scope={scope} range={range}/>:
   <QuotaChart accounts={accounts} range={range} language={language} style={style}/>}
  <SourceDetail view={view} selected={selected} measure={detailsMeasure} language={language} onClose={close}/>
 </div>;
}
