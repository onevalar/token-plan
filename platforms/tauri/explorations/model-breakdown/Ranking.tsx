import {Classic} from './Classic';
import {Variants} from './Readings';
import {composition,cost,exact,type Fixture} from './data';
import {scaleFor} from './arc/static-chart';

export function Ranking({fixture}:{fixture:Fixture}) {
 const info=composition(fixture);
 if(!info.valid)return <><p className="mb-notice">{info.reason} 以下保留原始列表。</p><Classic fixture={fixture}/></>;
 const models=[...fixture.row.models].sort((a,b)=>b.tokens-a.tokens);
 const {top}=scaleFor(Math.max(...models.map(m=>m.tokens),0));
 return <div className="mb-ranking">
  <p className="mb-caption">按已记录 tokens 排名，长度表示数量，不表示套餐使用率。</p>
  {info.remainder>0&&<p className="mb-notice">未归类记录：{exact(info.remainder)} tokens。未冒充一个已知模型，也未分摊费用。</p>}
  <div className="mb-axis"><span>0</span><span>统一刻度上限 {exact(top)} tokens</span></div>
  <ol>{models.map((m,i)=><li key={m.model}>
   <div className="mb-rank-heading"><span className="mb-rank-number">{i+1}</span><span>{m.model}</span></div>
   <div className="mb-rank-values"><strong>{exact(m.tokens)} <small>tokens</small></strong><span>{cost(m.cost)}</span></div>
   <div className="mb-track" aria-hidden="true"><span className="mb-bar" data-tokens={m.tokens} data-scale={top} style={{transform:`scaleX(${m.tokens/top})`}}/></div>
   <Variants model={m}/>
  </li>)}</ol>
 </div>;
}
