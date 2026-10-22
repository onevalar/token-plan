import {Classic} from './Classic';
import {Denominator,Variants} from './Readings';
import {composition,cost,exact,share,type Fixture} from './data';
import {StaticDonut,type Part} from './arc/static-chart';

export function Composition({fixture}:{fixture:Fixture}) {
 const info=composition(fixture);
 const parts:Part[]=fixture.row.models.filter(m=>m.tokens>0).map((m,i)=>({key:m.model,label:m.model,value:m.tokens,color:i<4?`var(--series-${i+1})`:'var(--text-secondary)'}));
 if(info.remainder>0)parts.push({key:'unclassified',label:'未归类记录',value:info.remainder,color:'var(--text-muted)'});
 const reason=info.reason||(parts.length>6?'本期有超过六个非零部分，环形难以逐一比较。改用列表，保留全部模型。':'');
 if(reason)return <><p className="mb-notice">{reason}{info.reason?' 以下保留原始列表。':''}</p><Classic fixture={fixture}/></>;
 return <div className="mb-composition">
  <Denominator fixture={fixture}/>
  {info.remainder>0&&<p className="mb-caption">其中未归类记录为 {exact(info.remainder)} tokens（{share(info.remainder,info.total)}），保留在分母与环形中。</p>}
  <StaticDonut parts={parts} total={info.total}/>
  <p className="mb-caption">{fixture.partial?'来源不完整，仅表示已记录 tokens 占比。':'同一记录日、同一来源的 tokens 构成。'}图例不隐藏数据，不重新归一化。</p>
  <ol className="mb-legend">{fixture.row.models.map(m=>{
   const part=parts.find(p=>p.key===m.model);
   return <li key={m.model}><div className="mb-legend-head"><span className="mb-swatch" style={{background:part?.color??'transparent'}} aria-hidden="true"/><span>{m.model}</span><strong>{share(m.tokens,info.total)}</strong></div>
    <div className="mb-legend-values"><span>{exact(m.tokens)} tokens</span><span>{cost(m.cost)}</span></div><Variants model={m}/>
   </li>;
  })}{info.remainder>0&&<li className="mb-unclassified"><div className="mb-legend-head"><span className="mb-swatch" style={{background:'var(--text-muted)'}} aria-hidden="true"/><span>未归类记录</span><strong>{share(info.remainder,info.total)}</strong></div><div className="mb-legend-values"><span>{exact(info.remainder)} tokens</span><span>费用未知</span></div></li>}</ol>
 </div>;
}
