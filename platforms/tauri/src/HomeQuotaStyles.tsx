import {GaugeArc} from './components/arc/gauge/gauge';
import type {Metric} from './desktop';
import {isQuotaMetric,MetricExpiries,MetricReset,MetricRow,type MetricRowProps} from './Metrics';
import {forecastSpan,projectedUsed,quotaReading,quotaMeter,type StyleSpec} from './homeUsage';
import {providerText} from './providerText';
import {countdown} from './usage';
import './home-quota-styles.css';

type Props={metrics:Metric[];spec:StyleSpec}&Omit<MetricRowProps,'metric'>;

export function HomeQuotaStyles({metrics,spec,...props}:Props) {
 const style=spec.root;
 // Pair adjacent independent windows; an extra model pool does not disable the pair.
 const paired=new Map<number,Metric[]>(),consumed=new Set<number>();
 if(style==='concentric')for(let i=0;i<metrics.length-1;i++){
  const a=metrics[i],b=metrics[i+1];
  if(!consumed.has(i)&&isQuotaMetric(a)&&isQuotaMetric(b)&&(a.periodSeconds??0)>0&&(b.periodSeconds??0)>0&&a.periodSeconds!==b.periodSeconds){
   paired.set(i,[a,b]);consumed.add(i+1);i++;
  }
 }
 return <div className="home-metrics home-variants" data-style={style}>{metrics.map((metric,index)=>{
  if(consumed.has(index))return null;
  if(!isQuotaMetric(metric))return <div className="home-metric-row" key={metric.id}><MetricRow metric={metric} {...props}/></div>;
  const quotas=paired.get(index);
  if(quotas)return <div className="home-concentric" key={metric.id}>
   <svg viewBox="0 0 100 90" aria-hidden="true" focusable="false">{quotas.map((m,i)=>{
    const r=quotaReading({metric:m,...props});return <GaugeArc key={m.id} value={r.value} radius={i===0?42:28} tone={r.tone==='critical'?'danger':'accent'}/>;
   })}</svg>
   <div className="home-concentric-readings">{quotas.map((m,i)=>{
    const r=quotaReading({metric:m,...props});
    return <div className="home-reading" data-metric={m.id} data-tone={r.tone} key={m.id}>
     <span className="home-quota-sr" {...quotaMeter(r)}/><Readout metric={m} {...props} position={providerText(i===0?'Outer Ring':'Inner Ring',props.language)}/>
    </div>;
   })}</div>
  </div>;
  return <Quota key={metric.id} metric={metric} spec={spec} {...props}/>;
 })}</div>;
}

function Readout(props:MetricRowProps&{position?:string}) {
 const r=quotaReading(props);
 return <div className="home-readout">
  <div className="home-quota-heading"><span>{props.position&&<small className="home-ring-position">{props.position}</small>}{r.name}</span><strong>{r.value===null?'—':r.valueText}</strong></div>
  <div className="home-quota-meta"><span className={r.warning?'quota-warning':''}>{r.value===null?props.missing:r.warning||r.mode}</span>{props.metric.hasData&&<MetricReset {...props}/>}</div>
  <MetricExpiries {...props}/>
 </div>;
}

function Reset(props:MetricRowProps) {
 const {metric:m,now,language}=props,timed=now&&m.hasData&&!m.notStarted&&countdown(m.resetsAt,now)!==null;
 if(!m.hasData)return null;
 return <span className="home-reset">{timed?<span>{providerText('Resets in',language)}</span>:null}<MetricReset {...props}/></span>;
}

function Quota({spec,...props}:MetricRowProps&{spec:StyleSpec}) {
 const {metric:m,remaining=false}=props,r=quotaReading(props),threshold=remaining?20:80,style=spec.root;
 const attributes={'data-metric':m.id,'data-tone':r.tone},forecast=projectedUsed(m,props.now,r.used);
 if(style==='numbers')return <article className="home-reading home-number" {...attributes} aria-label={r.label}>
  <div className="home-number-label"><span>{r.name}</span><small>{r.mode}</small></div>
  <span className="home-quota-sr">{r.description}</span>
  <p className="home-number-value" aria-hidden="true"><strong>{r.value===null?'—':Math.round(r.value)}</strong>{r.value!==null&&<span>%</span>}</p>
  {r.value===null&&<p className="quota-missing">{props.missing}</p>}
  <Reset {...props}/>{r.warning&&<p className="quota-warning">{r.warning}</p>}
  <MetricExpiries {...props}/>
 </article>;
 if(style==='ruler')return <div className="home-reading home-ruler" {...attributes}>
  <div className="home-ruler-heading"><span>{r.name} · {r.mode}</span><strong>{r.value===null?'—':r.valueText}</strong>{m.hasData&&<MetricReset {...props}/>}</div>
  {r.value===null?<p className="home-quota-unknown quota-missing">{props.missing}</p>:<div {...quotaMeter(r)}>
   <div className="home-ruler-graphic" aria-hidden="true">
    <div className="home-ruler-bar"><div className="home-ruler-track"><span style={{transform:`scaleX(${Math.max(0,Math.min(1,r.value/100))})`}}/></div>
     {spec.forecast&&forecast!==null&&<span className="home-forecast-stripe" style={forecastSpan(r.used!,forecast,remaining)}/>}
     <span className="home-ruler-limit" style={{left:remaining?'0%':'100%'}}/>
     <span className="home-ruler-threshold" style={{left:`${threshold}%`}}/>
    </div>
    <div className="home-ruler-ticks">{[0,20,40,60,80,100].map(tick=><span key={tick} style={{left:`${tick}%`}}>{tick===threshold?`${tick} ⚑`:tick}</span>)}</div>
   </div>
  </div>}
  {spec.forecast&&forecast!==null&&<p className="home-forecast-note">{providerText('Projected %@ by reset',props.language).replace('%@',`${Math.round(forecast)}%`)}</p>}
  {r.warning&&<p className="quota-warning">{r.warning}</p>}<MetricExpiries {...props}/>
 </div>;
 if(style==='segments')return <div className="home-reading home-segments" {...attributes}>
  <div className="home-segment-label"><span>{r.name} · {r.mode}</span><Reset {...props}/></div>
  <div className="home-segment-reading">
   {r.value===null?<div className="home-quota-unknown quota-missing">{props.missing}</div>:<div {...quotaMeter(r)}>
    <div className="home-segment-track" data-shape={spec.shape} aria-hidden="true" style={{gridTemplateColumns:`repeat(${spec.count},minmax(0,1fr))`}}>{Array.from({length:spec.count},(_,i)=><span key={i} style={spec.shape==='rising'?{height:`${40+60*i/Math.max(1,spec.count-1)}%`}:undefined}><span style={{transform:`scaleX(${Math.max(0,Math.min(1,r.value!/(100/spec.count)-i))})`}}/></span>)}</div>
   </div>}
   <strong aria-hidden="true">{r.value===null?'—':r.valueText}</strong>
  </div>
  {r.warning&&<p className="quota-warning">{r.warning}</p>}<MetricExpiries {...props}/>
 </div>;
 return <div className="home-reading home-compact" {...attributes}>
  <div className="home-small-meter" {...quotaMeter(r)}><svg viewBox="0 0 100 90" aria-hidden="true" focusable="false"><GaugeArc value={r.value} tone={r.tone==='critical'?'danger':'accent'}/></svg></div>
  <Readout {...props}/>
 </div>;
}
