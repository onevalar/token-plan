import {TrendingUp} from 'lucide-react';
import type {Metric} from './desktop';
import {isQuotaMetric,MetricExpiries,MetricReset,MetricRow,type MetricRowProps} from './Metrics';
import {forecastSpan,projectedUsed,quotaMeter,quotaReading,usageLevel,type StyleSpec,type VesselShape} from './homeUsage';
import {providerText} from './providerText';
import {DitherFill,textureAt,tintStyle} from './DitherFill';
import './home-extra-styles.css';

/** A model's share (0–1) of the account's recent tokens; the Source Split style spreads a limit's used part over these. */
export type SourceShare={name:string;share:number};
type Props={metrics:Metric[];spec:StyleSpec;sources:SourceShare[]}&Omit<MetricRowProps,'metric'>;
type ItemProps=MetricRowProps&{spec:StyleSpec;sources:SourceShare[];index:number};
const clamp=(v:number)=>Math.max(0,Math.min(100,v));

export function HomeExtraStyles({metrics,spec,sources,...props}:Props) {
 const quotas=metrics.filter(isQuotaMetric);
 const row=(metric:Metric)=><div className="home-metric-row" key={metric.id}><MetricRow metric={metric} {...props}/></div>;
 // A column chart compares several limits; a single one reads better as an ordinary bar.
 if(spec.family==='columns'&&quotas.length>=2)return <div className="home-metrics home-variants home-extra" data-style="columns">
  <Columns metrics={quotas} {...props}/>{metrics.filter(m=>!isQuotaMetric(m)).map(row)}
 </div>;
 return <div className="home-metrics home-variants home-extra" data-style={spec.root}>{metrics.map((metric,index)=>
  !isQuotaMetric(metric)||spec.family==='columns'||spec.family==='sources'&&!sources.length?row(metric):<Item key={metric.id} metric={metric} spec={spec} sources={sources} index={index} {...props}/>
 )}</div>;
}

function Missing({r,missing}:{r:ReturnType<typeof quotaReading>;missing:string}) {return r.value===null?<p className="home-quota-unknown quota-missing">{missing}</p>:null;}
function Reset(props:MetricRowProps) {return props.metric.hasData?<MetricReset {...props}/>:null;}

function Item({spec,sources,index,...props}:ItemProps) {
 const {metric:m}=props,r=quotaReading(props),attributes={'data-metric':m.id,'data-tone':r.tone},texture=textureAt(spec.texture,index);
 const heading=<div className="home-quota-heading"><span>{r.name}</span><strong>{r.value===null?'—':r.valueText}</strong></div>;
 if(spec.family==='bars'){
  const forecast=projectedUsed(m,props.now,r.used);
  return <div className="home-reading home-forecast" {...attributes}>{heading}
   {r.value!==null&&<div {...quotaMeter(r)}><div className="home-ruler-bar" aria-hidden="true">
    <div className="home-ruler-track"><span style={{transform:`scaleX(${clamp(r.value)/100})`}}/></div>
    {forecast!==null&&<span className="home-forecast-stripe" style={forecastSpan(r.used!,forecast,props.remaining??false)}/>}
    <span className="home-ruler-limit" style={{left:props.remaining?'0%':'100%'}}/>
   </div></div>}
   <div className="home-quota-meta">{forecast!==null&&<span className="home-forecast-marker" aria-label={providerText('Projected %@ by reset',props.language).replace('%@',`${Math.round(forecast)}%`)}><TrendingUp size={13} aria-hidden="true"/><span aria-hidden="true">{Math.round(forecast)}%</span></span>}<Reset {...props}/></div>
   <Missing r={r} missing={props.missing}/><MetricExpiries {...props}/>
  </div>;
 }
 if(spec.family==='vessel')return <div className="home-reading home-vessel" data-shape={spec.vessel} {...attributes}>
  <div className="home-vessel-graphic" {...quotaMeter(r)}>{r.value!==null&&<Vessel shape={spec.vessel} value={clamp(r.value)}/>}</div>
  <div className="home-readout">{heading}<div className="home-quota-meta">{r.value===null&&<span>{props.missing}</span>}{props.metric.hasData&&<Reset {...props}/>}</div><MetricExpiries {...props}/></div>
 </div>;
 if(spec.family==='frame')return <div className="home-reading home-frame" {...attributes} {...quotaMeter(r)}>
  <svg viewBox="0 0 340 64" preserveAspectRatio="none" aria-hidden="true" focusable="false">
   <rect className="home-frame-track" x="2" y="2" width="336" height="60" rx="16" pathLength="100"/>
   {r.value!==null&&<rect className="home-frame-fill" x="2" y="2" width="336" height="60" rx="16" pathLength="100" strokeDasharray={`${clamp(r.value)} 100`}/>}
  </svg>
  <div className="home-frame-body"><strong className="home-frame-value">{r.value===null?'—':r.valueText}</strong><div className="home-frame-details"><span>{r.name}</span>{r.value===null?<span className="home-frame-missing">{props.missing}</span>:<Reset {...props}/>}</div></div>
 </div>;
 if(spec.family==='signal'){
  const level=usageLevel(r.used),lit=['calm','watch','critical'].indexOf(level);
  return <div className="home-reading home-signal" data-level={level} {...attributes}>
   <div className="home-quota-heading"><span>{r.name}</span><strong>{r.value===null?'—':r.valueText}</strong></div>
   <div className="home-signal-line" {...quotaMeter(r)}>
    <span className="home-signal-lamps" aria-hidden="true">{[0,1,2].map(i=><span key={i} data-on={r.value!==null&&i===lit}/>)}</span><Reset {...props}/>
   </div>
   {r.value===null&&<Missing r={r} missing={props.missing}/>}
   <MetricExpiries {...props}/>
  </div>;
 }
 // Textured Bar's card layouts: the full-width card textures the whole Row Fill shape; the half-width bar puts the
 // same reading above a separate textured bar. Neither adds Used/Remaining copy.
 if(spec.family==='texturebar'){
  const fill=r.value!==null&&<DitherFill className={spec.layout==='card'?'home-rowfill-texture':'home-texture-meter'} value={clamp(r.value)} texture={texture} intro/>;
  const reading=<><strong className="home-rowfill-value" aria-hidden="true">{r.value===null?'—':r.valueText}</strong>
   <span className="home-rowfill-meta"><span>{r.name}</span><MetricReset {...props}/></span></>;
  if(spec.layout==='card')return <div className="home-reading home-rowfill" data-texture={texture} {...attributes} {...quotaMeter(r)} style={tintStyle(spec.tint)}>{fill}{reading}</div>;
  return <div className="home-reading home-texture-half" {...attributes} style={tintStyle(spec.tint)}>
   <div className="home-texture-half-reading">{reading}</div>
   {r.value===null?<Missing r={r} missing={props.missing}/>:<div {...quotaMeter(r)}>{fill}</div>}
   <MetricExpiries {...props}/>
  </div>;
 }
 return <Sources {...props} sources={sources}/>;
}

/** Fill level drawn as a container: it follows the Used/Remaining setting like every other style. */
function Vessel({shape,value}:{shape:VesselShape;value:number}) {
 const f=value/100;
 if(shape==='battery')return <svg viewBox="0 0 120 44" width="84" focusable="false" aria-hidden="true">
  <rect className="v-outline" x="2" y="4" width="104" height="36" rx="8"/><rect className="v-nub" x="108" y="15" width="7" height="14" rx="2"/>
  <rect className="v-fill" x="7" y="9" width={94*f} height="26" rx="4"/>
 </svg>;
 if(shape==='tank')return <svg viewBox="0 0 44 60" width="44" focusable="false" aria-hidden="true">
  <defs><clipPath id="tank-clip"><rect x="5" y="5" width="34" height="50" rx="8"/></clipPath></defs>
  <g clipPath="url(#tank-clip)"><rect className="v-fill" x="5" y={55-50*f} width="34" height={50*f+1}/>{f>0&&f<1&&<path className="v-wave" d={`M5 ${55-50*f} q8.5 -4 17 0 t17 0`}/>}</g>
  <rect className="v-outline" x="3" y="3" width="38" height="54" rx="10"/>
 </svg>;
 if(shape==='thermometer')return <svg viewBox="0 0 64 80" width="52" focusable="false" aria-hidden="true">
  <rect className="v-outline" x="14" y="3" width="14" height="56" rx="7"/><circle className="v-outline" cx="21" cy="64" r="11"/>
  <circle className="v-fill" cx="21" cy="64" r="7.5"/><rect className="v-fill" x="17.5" y={8+48*(1-f)} width="7" height={48*f+8}/>
  {[0,25,50,75,100].map(t=><g key={t}><path className="v-tick" d={`M32 ${56-48*t/100}h5`}/><text x="40" y={58-48*t/100} className="v-label">{t}</text></g>)}
 </svg>;
 return <svg viewBox="0 0 40 64" width="38" focusable="false" aria-hidden="true">
  <defs><clipPath id="glass-top"><path d="M8 8h24l-12 22z"/></clipPath><clipPath id="glass-bottom"><path d="M20 34l12 22H8z"/></clipPath></defs>
  <rect className="v-fill" x="8" y={8+22*(1-f)} width="24" height={22*f} clipPath="url(#glass-top)"/>
  <rect className="v-fill" x="8" y={56-22*(1-f)} width="24" height={22*(1-f)} clipPath="url(#glass-bottom)"/>
  <path className="v-outline" d="M6 4h28M6 60h28M9 4c0 12 5 20 11 28-6 8-11 16-11 28M31 4c0 12-5 20-11 28 6 8 11 16 11 28" fill="none"/>
 </svg>;
}

function Sources({sources,...props}:MetricRowProps&{sources:SourceShare[]}) {
 const {metric:m}=props,r=quotaReading({...props,remaining:false});
 const used=r.used,top=sources.slice(0,3),rest=1-top.reduce((n,s)=>n+s.share,0),parts=[...top,...rest>0.005?[{name:providerText('Other',props.language),share:rest}]:[]];
 return <div className="home-reading home-sources" data-metric={m.id} data-tone={r.tone}>
  <div className="home-quota-heading"><span>{r.name}</span><strong>{used===null?'—':`${Math.round(used)}%`}</strong></div>
  {used!==null&&<div role="meter" aria-label={`${r.name} · ${providerText('Used',props.language)}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={clamp(used)} aria-valuetext={parts.map(p=>`${p.name} ${Math.round(used*p.share)}%`).join(', ')}>
   <div className="home-ruler-track home-sources-track" aria-hidden="true">{parts.map((p,i)=><span key={p.name} style={{width:`${clamp(used)*p.share}%`,opacity:[1,.7,.45,.25][i]}}/>)}</div>
   <ul className="home-sources-legend" aria-hidden="true">{parts.map((p,i)=><li key={p.name}><i style={{opacity:[1,.7,.45,.25][i]}}/><span>{p.name}</span><b>{Math.round(used*p.share)}%</b></li>)}</ul>
  </div>}
  <div className="home-quota-meta">{used===null&&<span>{props.missing}</span>}<Reset {...props}/></div>
  <MetricExpiries {...props}/>
 </div>;
}

function Columns({metrics,...props}:{metrics:Metric[]}&Omit<MetricRowProps,'metric'>) {
 return <div className="home-columns">{metrics.map(metric=>{
  const r=quotaReading({metric,...props});
  return <div className="home-column" data-metric={metric.id} data-tone={r.tone} key={metric.id}>
   <strong>{r.value===null?'—':r.valueText}</strong>
   <div className="home-column-track" {...quotaMeter(r)}><span className="home-column-fill" style={{height:`${r.value===null?0:clamp(r.value)}%`}}/>{r.tone==='critical'&&<span className="home-column-alert" aria-hidden="true">▲</span>}</div>
   <span className="home-column-name">{r.name}</span>{r.value===null&&<small>{props.missing}</small>}
   <Reset {...props} metric={metric}/>
  </div>;
 })}</div>;
}
