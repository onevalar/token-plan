import {Gauge} from './components/arc/gauge/gauge';
import {TickRing} from './components/arc/tick-ring/tick-ring';
import {WaffleChart} from './components/arc/waffle-chart/waffle-chart';
import type {Metric} from './desktop';
import {isQuotaMetric,MetricRow,MetricReset,MetricExpiries,type MetricRowProps} from './Metrics';
import {providerText} from './providerText';
import './home-metrics.css';
import {HomeQuotaStyles} from './HomeQuotaStyles';
import {quotaReading,quotaMeter,type HomeUsageStyle} from './homeUsage';

export type {HomeUsageStyle} from './homeUsage';
type ReadingProps=Omit<MetricRowProps,'metric'>;
export function HomeMetrics({metrics,style,...reading}:{metrics:Metric[];style:HomeUsageStyle}&ReadingProps) {
 if(style==='bars')return <>{metrics.map(metric=><MetricRow key={metric.id} metric={metric} {...reading}/>)}</>;
 if(style!=='gauges'&&style!=='cells'&&style!=='ticks')return <HomeQuotaStyles metrics={metrics} style={style} {...reading}/>;
 return <div className="home-metrics" data-style={style}>{metrics.map(metric=>isQuotaMetric(metric)?
  <QuotaTile key={metric.id} metric={metric} style={style} {...reading}/>:
  <div className="home-metric-row" key={metric.id}><MetricRow metric={metric} {...reading}/></div>
 )}</div>;
}

function QuotaTile({metric:m,style,now,language,missing,remaining=false}:MetricRowProps&{style:'gauges'|'cells'|'ticks'}) {
 const tr=(s:string)=>providerText(s,language);
 const reading=quotaReading({metric:m,now,language,missing,remaining});
 const {name,mode,value,tone,label,warning,valueText,description}=reading;
 return <div className="home-quota" data-metric={m.id} data-tone={tone}>
  <div className="quota-title">{name}{style==='gauges'&&<> · {mode}</>}</div>
  <div className="quota-body">{value===null?<div className="quota-missing"><span aria-hidden="true">—</span><span>{missing}</span></div>:
   style==='ticks'?<div className="quota-ticks" {...quotaMeter(reading)}><TickRing value={value} valueText={valueText} mode={mode} tone={tone==='critical'?'danger':'accent'}/></div>:
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
