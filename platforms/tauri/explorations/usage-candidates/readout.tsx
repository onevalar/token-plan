import type {Metric} from '../../src/desktop';
import {usageTone,metricName,MetricReset,MetricExpiries} from '../../src/Metrics';
import {now} from './data';

export type VariantProps={metrics:Metric[];remaining:boolean;missing:string};
export function reading(m:Metric,remaining:boolean) {
 const value=m.hasData?m.percent:null;
 const used=value===null?null:remaining?100-value:value;
 return {value,mode:remaining?'剩余':'已用',tone:value===null?'normal':usageTone(value,remaining),
  text:value===null?'—':`${Math.round(value)}%`,name:metricName(m,'zh-Hans'),
  warning:used===null?'':used>100?`超额 ${Math.round(used-100)} 个百分点`:used===100?'额度已用尽':used>=80?'接近额度上限':''};
}
export function Readout({metric:m,remaining,missing,position}:{metric:Metric;remaining:boolean;missing:string;position?:string}) {
 const r=reading(m,remaining);
 return <div className="candidate-readout" data-metric={m.id} data-tone={r.tone}>
  <div className="candidate-heading"><span>{position&&<small className="ring-position">{position}</small>}{r.name}</span><strong>{r.text}</strong></div>
  <div className="candidate-meta"><span className={r.warning?'candidate-warning':''}>{r.value===null?missing:r.warning||r.mode}</span><MetricReset metric={m} now={now} missing={missing} language="zh-Hans"/></div>
  <MetricExpiries metric={m} language="zh-Hans"/>
 </div>;
}
export function meterProps(m:Metric,remaining:boolean) {
 const r=reading(m,remaining);
 return r.value===null?{}:{role:'meter' as const,'aria-label':`${r.name} · ${r.mode}`,'aria-valuemin':0,'aria-valuemax':100,
  'aria-valuenow':Math.max(0,Math.min(100,r.value)),'aria-valuetext':[`${r.value}%`,r.warning,m.notStarted?'尚未开始':''].filter(Boolean).join(' · ')};
}
