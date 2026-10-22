import {Gauge} from './components/arc/gauge/gauge';
import {WaffleChart} from './components/arc/waffle-chart/waffle-chart';
import type {Metric} from './desktop';
import {isQuotaMetric,metricName,MetricRow,MetricReset,MetricExpiries,usageTone,type MetricRowProps} from './Metrics';
import {providerText} from './providerText';
import './home-metrics.css';

export type HomeUsageStyle='bars'|'gauges'|'cells';
type ReadingProps=Omit<MetricRowProps,'metric'>;
export function HomeMetrics({metrics,style,...reading}:{metrics:Metric[];style:HomeUsageStyle}&ReadingProps) {
 if(style==='bars')return <>{metrics.map(metric=><MetricRow key={metric.id} metric={metric} {...reading}/>)}</>;
 return <div className="home-metrics" data-style={style}>{metrics.map(metric=>isQuotaMetric(metric)?
  <QuotaTile key={metric.id} metric={metric} style={style} {...reading}/>:
  <div className="home-metric-row" key={metric.id}><MetricRow metric={metric} {...reading}/></div>
 )}</div>;
}

function QuotaTile({metric:m,style,now,language,missing,remaining=false}:MetricRowProps&{style:'gauges'|'cells'}) {
 const tr=(s:string)=>providerText(s,language),name=metricName(m,language),mode=tr(remaining?'Remaining':'Used');
 // The helper already converted percent to the chosen mode. Only danger uses actual consumption.
 const value=m.hasData?m.percent:null,used=value===null?null:remaining?100-value:value;
 const tone=value===null?'normal':usageTone(value,remaining),label=`${name} · ${mode}`;
 const warning=used===null?'':used>100?tr('Quota exceeded'):used===100?tr('Quota exhausted'):tone==='critical'?tr('Near quota limit'):'';
 const valueText=value===null?missing:`${Math.round(value)}%`,description=[valueText,warning].filter(Boolean).join(' · ');
 return <div className="home-quota" data-metric={m.id} data-tone={tone}>
  <div className="quota-title">{name}{style==='gauges'&&<> · {mode}</>}</div>
  <div className="quota-body">{value===null?<div className="quota-missing"><span aria-hidden="true">—</span><span>{missing}</span></div>:
   style==='gauges'?<div className="quota-gauge"><Gauge value={value} label={label} valueText={description} tone={tone==='critical'?'danger':'accent'}/></div>:
   <div className="quota-cells">{value>=0&&value<=100&&<div className="quota-grid"><WaffleChart label={`${label} · ${description}. ${tr('Each cell is 1%.')}`} data={[
    {key:'reading',value,color:'var(--quota-color)'},{key:'rest',value:100-value,color:'var(--border-strong)'},
   ]}/></div>}<div className="quota-number"><strong>{valueText}</strong><span>{mode}</span></div></div>
  }</div>
  <span className="quota-warning">{warning}</span>
  {m.hasData?<MetricReset metric={m} now={now} missing={missing} language={language}/>:<span/>}
  <div className="quota-expiries"><MetricExpiries metric={m} language={language}/></div>
 </div>;
}
