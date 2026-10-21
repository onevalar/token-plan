import {Hourglass} from 'lucide-react';
import type {Metric} from './desktop';
import {countdown,period} from './usage';
import {providerText} from './providerText';
import {textFor} from './copy';

export function metricName(m:Metric,language:string) {
 const duration=period(m.periodSeconds);
 const scope=m.label.match(/\b(argon|sonnet|claude|spark|fable)\b/i)?.[0];
 return duration?[scope,duration].filter(Boolean).join(' · '):providerText(m.label,language);
}
export function usageTone(percent:number,remaining:boolean) {
 const used=remaining?100-percent:percent;
 return used>=90?'critical':used>=70?'warning':'normal';
}
export function MetricRow({metric:m,now,missing,language,remaining=false}:{metric:Metric;now:number;missing:string;language:string;remaining?:boolean}) {
 const name=metricName(m,language),t=textFor(language);
 const reset=now&&m.hasData?countdown(m.resetsAt,now):null;
 const format=(v:number,unit:string)=>unit==='dollars'?`$${v.toFixed(2)}`:unit==='yuan'?`¥${v.toFixed(2)}`:new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(v);
 if(m.chart.length){
  const max=Math.max(1,...m.chart.map(p=>p.value));
  const points=m.chart.map((p,i)=>`${i*180/Math.max(1,m.chart.length-1)},${26-p.value/max*22}`).join(' ');
  return <div className="metric-chart"><span>{name}</span><svg viewBox="0 0 180 28" role="img" aria-label={name}>{m.chart.length===1?<circle cx="90" cy={26-m.chart[0].value/max*22} r="2" fill="currentColor"/>:<polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}</svg></div>;
 }
 const bounded=m.percent!=null||m.periodSeconds!=null;
 return <div className="metric-block"><div className={`metric ${bounded?'':'text-metric'}`} data-tone={m.percent==null?'normal':usageTone(m.percent,remaining)}>
  <span className="metric-name">{name}</span>
  {bounded?<><progress aria-label={`${name} · ${providerText(remaining?'Remaining':'Used',language)}`} aria-valuetext={!m.hasData||m.percent==null?missing:undefined} max={100} value={m.hasData?Math.max(0,Math.min(100,m.percent??0)):0}/><span className="value">{m.hasData&&m.percent!=null?`${Math.round(m.percent)}%`:'—'}</span></>:<span className="amount">{!m.hasData?missing:m.values.length?m.values.map(v=>`${format(v.amount,v.unit)}${v.label?` ${providerText(v.label,language)}`:''}`).join(' · '):m.amount==null?missing:format(m.amount,m.unit)}</span>}
  {bounded&&<span className="reset">{reset&&!m.notStarted?<><Hourglass size={13} aria-hidden="true"/><span>{reset}</span></>:<span className="reset-label">{!m.hasData?missing:m.notStarted?t.notStarted:'—'}</span>}</span>}
 </div>{m.expiries.length>0&&<div className="expiries"><span>{t.expires}</span><ul>{m.expiries.map((date,i)=><li key={i}>{new Date(date).toLocaleString(language)}</li>)}</ul></div>}</div>;
}
