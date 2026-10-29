import {useId,useLayoutEffect,useRef,useState} from 'react';
import {X} from 'lucide-react';
import {Button} from './components/arc/button/button';
import type {Metric} from './desktop';
import {preciseQuotaReading,quotaCycle,quotaPercent,type HomeQuotaDesign} from './homeUsage';
import {providerText} from './providerText';
import {HomeInstrumentStyles} from './HomeInstrumentStyles';
import {HomeCellStyles} from './HomeCellStyles';
import {HomeCycleStyles} from './HomeCycleStyles';
import {HomeRailStyles} from './HomeRailStyles';
import {HomeEditorialStyles} from './HomeEditorialStyles';
import {Expiries,Reset,Status,type ReadingProps} from './HomeQuotaParts';
import './home-quota-designs.css';

const renderers={instrument:HomeInstrumentStyles,cells:HomeCellStyles,cycle:HomeCycleStyles,rail:HomeRailStyles,editorial:HomeEditorialStyles};

/** An inline disclosure keeps exact quota and reset information in Home without adding another navigation route. */
export function HomeQuotaDesigns({metrics,design,style,...reading}:{metrics:Metric[];design:HomeQuotaDesign;style:string}&ReadingProps) {
 const [selected,setSelected]=useState<string|null>(null),detailId=useId(),trigger=useRef<HTMLButtonElement|null>(null);
 const metric=metrics.find(m=>m.id===selected),Renderer=renderers[design.group];
 const close=()=>{
  setSelected(null);
  if(trigger.current?.isConnected){trigger.current.focus({preventScroll:true});trigger.current.scrollIntoView({block:'nearest'});}
 };
 const onSelect=(id:string,button:HTMLButtonElement)=>{
  trigger.current=button;
  if(id===selected)close();else setSelected(id);
 };
 return <div className="home-quota-designs" data-style={style} onKeyDown={event=>{
  if(event.key==='Escape'&&metric){event.preventDefault();event.stopPropagation();close();}
 }}>
  <Renderer metrics={metrics} variant={design.variant} selected={metric?.id??null} detailId={detailId} onSelect={onSelect} {...reading}/>
  {metric&&<QuotaDetail key={metric.id} id={detailId} metric={metric} onClose={close} {...reading}/>}
 </div>;
}

function QuotaDetail({id,metric,onClose,...props}:ReadingProps&{id:string;metric:Metric;onClose:()=>void}) {
 const ref=useRef<HTMLElement>(null),r=preciseQuotaReading({metric,...props}),cycle=quotaCycle(metric,props.now);
 const tr=(key:string)=>providerText(key,props.language),format=(value:number|null)=>value===null?props.missing:quotaPercent(value,props.language);
 useLayoutEffect(()=>{ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'nearest'});},[]);
 return <section ref={ref} id={id} className="hq-detail" role="region" aria-labelledby={`${id}-title`} tabIndex={-1}>
  <header><h3 id={`${id}-title`}>{r.name} · {tr('Quota Details')}</h3><Button size="sm" variant="ghost" aria-label={tr('Close Quota Details')} onClick={onClose}><X size={16} aria-hidden="true"/></Button></header>
  <dl>
   <div><dt>{tr('Used')}</dt><dd>{format(r.used)}</dd></div>
   <div><dt>{tr('Remaining')}</dt><dd>{format(r.used===null?null:100-r.used)}</dd></div>
   <div><dt>{tr('Cycle Elapsed')}</dt><dd>{format(cycle.elapsed===null?null:Math.round(cycle.elapsed*10)/10)}</dd></div>
   <div><dt>{tr('Reset Time')}</dt><dd>{!metric.hasData?props.missing:cycle.endsAt===null?<Reset metric={metric} {...props}/>:<time dateTime={new Date(cycle.endsAt).toISOString()}>{new Date(cycle.endsAt).toLocaleString(props.language)}</time>}</dd></div>
  </dl>
  <Status r={r} missing={props.missing}/><Expiries metric={metric} language={props.language}/>
 </section>;
}
