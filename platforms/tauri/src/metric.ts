import type {Metric} from './desktop';
import {period} from './usage';
import {providerText} from './providerText';

/** Plain-language meaning of a short period label. */
export function windowDescription(seconds:number|null|undefined,language:string) {
 if(!seconds||seconds<=0)return undefined;
 const [n,unit]=seconds%604800===0?[seconds/604800,'week']:seconds%86400===0?[seconds/86400,'day']:seconds%3600===0?[seconds/3600,'hour']:[Math.ceil(seconds/60),'minute'];
 return providerText(`%@-${unit} window`,language).replace('%@',String(n));
}

export function metricScope(m:Metric) {
 const duration=period(m.periodSeconds);
 if(!duration)return m.label;
 if(/^(session|daily|weekly|monthly)( quota| window| limit)?$/i.test(m.label)||/^\d+\s*(h|w|d|m|hours?|weeks?|days?|minutes?)$/i.test(m.label))return '';
 return m.label.replace(new RegExp(`(?:\\s*·\\s*|\\s+)(daily|weekly|monthly|${duration})$`,'i'),'');
}
export function metricName(m:Metric,language:string) {
 return [providerText(metricScope(m),language),period(m.periodSeconds)].filter(Boolean).join(' · ');
}
export function usageTone(percent:number,remaining:boolean) {
 return (remaining?100-percent:percent)>=80?'critical':'normal';
}
export type MetricRowProps={metric:Metric;now:number;missing:string;language:string;remaining?:boolean};
export function isQuotaMetric(m:Metric) {
 return !m.chart.length&&(m.percent!=null||m.periodSeconds!=null||m.unit==='percent');
}
export function metricAmount(m:Metric,language:string,missing:string) {
 if(!m.hasData)return missing;
 if(m.statusText)return providerText(m.statusText,language);
 const format=(v:number,unit:string)=>m.label==='Credits'?new Intl.NumberFormat(language,{maximumFractionDigits:4}).format(v):unit==='dollars'?`$${v.toFixed(2)}`:unit==='yuan'?`¥${v.toFixed(2)}`:new Intl.NumberFormat(language,{notation:'compact',maximumFractionDigits:1}).format(v);
 return m.values.length?m.values.map(v=>`${format(v.amount,v.unit)}${v.label?` ${providerText(v.label,language)}`:''}`).join(' · '):m.amount==null?missing:format(m.amount,m.unit);
}
