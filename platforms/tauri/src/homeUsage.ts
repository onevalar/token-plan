import type {MetricRowProps} from './Metrics';
import {metricName,usageTone} from './Metrics';
import {providerText} from './providerText';

export const homeUsageStyles={bars:'Bars',gauges:'Gauges',cells:'Percentage Grid',rings:'Compact Rings',ruler:'Quota Ruler',concentric:'Concentric Rings',numbers:'Numbers',segments:'Segmented Bar',ticks:'Tick Ring'} as const;
export type HomeUsageStyle=keyof typeof homeUsageStyles;
export function isHomeUsageStyle(value:string):value is HomeUsageStyle {return Object.hasOwn(homeUsageStyles,value);}

export function quotaReading({metric:m,language,missing,remaining=false}:MetricRowProps) {
 const tr=(s:string)=>providerText(s,language),name=metricName(m,language),mode=tr(remaining?'Remaining':'Used');
 // The helper already converted percent to the chosen mode. Only danger uses actual consumption.
 const value=m.hasData?m.percent:null,used=value===null?null:remaining?100-value:value;
 const tone=value===null?'normal':usageTone(value,remaining),label=`${name} · ${mode}`;
 const warning=used===null?'':used>100?tr('Quota exceeded'):used===100?tr('Quota exhausted'):tone==='critical'?tr('Near quota limit'):'';
 const valueText=value===null?missing:`${Math.round(value)}%`,description=[valueText,warning].filter(Boolean).join(' · ');
 return {value,tone,name,mode,label,warning,valueText,description};
}

export function quotaMeter(reading:ReturnType<typeof quotaReading>) {
 return reading.value===null?{}:{role:'meter' as const,'aria-label':reading.label,'aria-valuemin':0,'aria-valuemax':100,
  'aria-valuenow':Math.max(0,Math.min(100,reading.value)),'aria-valuetext':reading.description};
}
