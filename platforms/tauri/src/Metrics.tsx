import {Hourglass} from 'lucide-react';
import type {Metric} from './desktop';
import {countdown,period} from './usage';
import {providerText} from './providerText';
import {textFor} from './copy';

/** "5h" → "5-hour window": the plain-language meaning of the short window label, shown as a tooltip. */
export function windowDescription(seconds:number|null|undefined,language:string) {
 if(!seconds||seconds<=0)return undefined;
 const [n,unit]=seconds%604800===0?[seconds/604800,'week']:seconds%86400===0?[seconds/86400,'day']:seconds%3600===0?[seconds/3600,'hour']:[Math.ceil(seconds/60),'minute'];
 // Look the template up by its exact key and fill in the number ourselves; matching an already-filled sentence against
 // every table entry can pick the wrong one ("3h" also fits the "%lldh" duration pattern).
 return providerText(`%@-${unit} window`,language).replace('%@',String(n));
}

function metricScope(m:Metric) {
 // Only remove period wording when the provider actually supplies a period.
 const duration=period(m.periodSeconds);
 if(!duration)return m.label;
 if(/^(session|daily|weekly|monthly)( quota| window| limit)?$/i.test(m.label)||/^\d+\s*(h|w|d|m|hours?|weeks?|days?|minutes?)$/i.test(m.label))return '';
 return m.label.replace(new RegExp(`(?:\\s*·\\s*|\\s+)(daily|weekly|monthly|${duration})$`,'i'),'');
}
export function metricName(m:Metric,language:string) {
 return [providerText(metricScope(m),language),period(m.periodSeconds)].filter(Boolean).join(' · ');
}
export function usageTone(percent:number,remaining:boolean) {
 const used=remaining?100-percent:percent;
 return used>=80?'critical':'normal';
}
export type MetricRowProps={metric:Metric;now:number;missing:string;language:string;remaining?:boolean};
export function isQuotaMetric(m:Metric) {
 return !m.chart.length&&(m.percent!=null||m.periodSeconds!=null||m.unit==='percent');
}
export function MetricReset({metric:m,now,missing,language}:Omit<MetricRowProps,'remaining'>) {
 const reset=now&&m.hasData?countdown(m.resetsAt,now):null;
 return <span className="reset" title={reset&&!m.notStarted?providerText('Resets in %@',language).replace('%@',reset):undefined}>{reset&&!m.notStarted?<><span>{reset}</span><Hourglass size={13} aria-hidden="true"/></>:<span className="reset-status">{!m.hasData?missing:m.notStarted?textFor(language).notStarted:'—'}</span>}</span>;
}
export function MetricExpiries({metric:m,language}:Pick<MetricRowProps,'metric'|'language'>) {
 return m.expiries.length>0?<div className="expiries"><span>{textFor(language).expires}</span><ul>{m.expiries.map((date,i)=><li key={i}>{new Date(date).toLocaleString(language)}</li>)}</ul></div>:null;
}
export function MetricRow({metric:m,now,missing,language,remaining=false}:MetricRowProps) {
 const name=metricName(m,language);
 const format=(v:number,unit:string)=>unit==='dollars'?`$${v.toFixed(2)}`:unit==='yuan'?`¥${v.toFixed(2)}`:new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(v);
 if(m.chart.length){
  const max=Math.max(1,...m.chart.map(p=>p.value));
  const points=m.chart.map((p,i)=>`${i*180/Math.max(1,m.chart.length-1)},${26-p.value/max*22}`).join(' ');
  return <div className="metric-chart"><span>{name}</span><svg viewBox="0 0 180 28" role="img" aria-label={name}>{m.chart.length===1?<circle cx="90" cy={26-m.chart[0].value/max*22} r="2" fill="currentColor"/>:<polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>}</svg></div>;
 }
 const bounded=isQuotaMetric(m);
 // Amp's non-periodic Orb allowance fits the short label column on both helpers.
 const orb=m.label==='Orb Usage'&&!period(m.periodSeconds);
 const scope=bounded&&!orb?providerText(metricScope(m),language):'';
 return <div className="metric-block"><div className={`metric ${bounded?'':'text-metric'}`} data-tone={!m.hasData||m.percent==null?'normal':usageTone(m.percent,remaining)}>
  <span className="metric-name" title={windowDescription(m.periodSeconds,language)}>{orb?'Orb':bounded?period(m.periodSeconds)||'—':name}</span>
  {bounded?<><div className="metric-meter">{scope&&<span className="metric-scope">{scope}</span>}<progress aria-label={`${name} · ${providerText(remaining?'Remaining':'Used',language)}`} aria-valuetext={!m.hasData||m.percent==null?missing:undefined} max={100} value={m.hasData?Math.max(0,Math.min(100,m.percent??0)):0}/></div><span className="value">{m.hasData&&m.percent!=null?`${Math.round(m.percent)}%`:'—'}</span></>:<span className="amount">{!m.hasData?missing:m.values.length?m.values.map(v=>`${format(v.amount,v.unit)}${v.label?` ${providerText(v.label,language)}`:''}`).join(' · '):m.amount==null?missing:format(m.amount,m.unit)}</span>}
  {bounded&&<MetricReset metric={m} now={now} missing={missing} language={language}/>}
 </div><MetricExpiries metric={m} language={language}/></div>;
}
