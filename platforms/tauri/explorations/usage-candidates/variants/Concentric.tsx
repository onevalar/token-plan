import {isQuotaMetric} from '../../../src/Metrics';
import {ArcPath} from '../arc-graphics';
import {Readout,reading,meterProps,type VariantProps} from '../readout';
import {Compact} from './Compact';

export function Concentric(props:VariantProps) {
 const {metrics,remaining,missing}=props;
 // Pair only two adjacent, distinct-period quotas within this one account.
 // Other shapes keep their original order and use independent compact meters.
 const quotas=metrics.filter(isQuotaMetric),first=metrics.indexOf(quotas[0]);
 const paired=quotas.length===2&&quotas.every(m=>m.periodSeconds!==null)&&quotas[0].periodSeconds!==quotas[1].periodSeconds&&metrics[first+1]===quotas[1];
 if(!paired)return <Compact {...props}/>;
 return <>{metrics.slice(0,first).length>0&&<Compact {...props} metrics={metrics.slice(0,first)}/>}
  <div className="concentric-quotas">
   <svg className="concentric-graphic" viewBox="0 0 100 90" aria-hidden="true" focusable="false">
    {quotas.map((m,i)=>{const r=reading(m,remaining);return <ArcPath key={m.id} value={r.value} radius={i===0?42:28} tone={r.tone}/>;})}
   </svg>
   <div className="concentric-readings">{quotas.map((m,i)=><div key={m.id}><span className="candidate-sr" {...meterProps(m,remaining)}/><Readout metric={m} remaining={remaining} missing={missing} position={i===0?'外圈':'内圈'}/></div>)}</div>
  </div>
  {metrics.slice(first+2).length>0&&<Compact {...props} metrics={metrics.slice(first+2)}/>}
 </>;
}
