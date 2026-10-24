import {Gauge} from './components/arc/gauge/gauge';
import {TickRing} from './components/arc/tick-ring/tick-ring';
import {WaffleChart} from './components/arc/waffle-chart/waffle-chart';
import type {Metric} from './desktop';
import {isQuotaMetric,MetricRow,MetricReset,MetricExpiries,type MetricRowProps} from './Metrics';
import './home-metrics.css';
import {HomeQuotaStyles} from './HomeQuotaStyles';
import {HomeExtraStyles,type SourceShare} from './HomeExtraStyles';
import {parseStyle,quotaReading,quotaMeter,type HomeUsageStyle} from './homeUsage';

export type {HomeUsageStyle} from './homeUsage';
type ReadingProps=Omit<MetricRowProps,'metric'>;
export function HomeMetrics({metrics,style,sources=[],...reading}:{metrics:Metric[];style:HomeUsageStyle;sources?:SourceShare[]}&ReadingProps) {
 const spec=parseStyle(style)??parseStyle('bars')!,{root}=spec;
 if(root==='cells'||root==='gauges'||root==='ticks')return <div className="home-metrics" data-style={root}>{metrics.map(metric=>isQuotaMetric(metric)?
  <QuotaTile key={metric.id} metric={metric} style={root} {...reading}/>:
  <div className="home-metric-row" key={metric.id}><MetricRow metric={metric} {...reading}/></div>
 )}</div>;
 if(['rings','concentric','ruler','numbers','segments'].includes(root))return <HomeQuotaStyles metrics={metrics} spec={spec} {...reading}/>;
 if(spec.family==='bars'&&!spec.forecast)return <>{metrics.map(metric=><MetricRow key={metric.id} metric={metric} {...reading}/>)}</>;
 return <HomeExtraStyles metrics={metrics} spec={spec} sources={sources} {...reading}/>;
}

function QuotaTile({metric:m,style,now,language,missing,remaining=false}:MetricRowProps&{style:'gauges'|'cells'|'ticks'}) {
 const reading=quotaReading({metric:m,now,language,missing,remaining});
 const {name,value,tone,label,valueText,description}=reading;
 return <div className="home-quota" data-metric={m.id} data-tone={tone}>
  <div className="quota-title">{name}</div>
  <div className="quota-body">{value===null?<div className="quota-missing"><span aria-hidden="true">—</span><span>{missing}</span></div>:
   style==='ticks'?<div className="quota-ticks" {...quotaMeter(reading)}><TickRing value={value} valueText={valueText} tone={tone==='critical'?'danger':'accent'}/></div>:
   style==='gauges'?<div className="quota-gauge"><Gauge value={value} label={label} valueText={description} tone={tone==='critical'?'danger':'accent'}/></div>:
   <div className="quota-cells">{value>=0&&value<=100&&<div className="quota-grid"><WaffleChart label={`${label} · ${description}`} data={[
    {key:'reading',value,color:'var(--quota-color)'},{key:'rest',value:100-value,color:'var(--border-strong)'},
   ]}/></div>}<div className="quota-number"><strong>{valueText}</strong></div></div>
  }</div>
  {m.hasData?<MetricReset metric={m} now={now} missing={missing} language={language}/>:<span/>}
  <div className="quota-expiries"><MetricExpiries metric={m} language={language}/></div>
 </div>;
}
