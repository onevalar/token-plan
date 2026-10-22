import {cost,exact,type Fixture,type ModelRecord} from './data';

export function Variants({model}:{model:ModelRecord}) {
 return model.variants.length>0?<details className="mb-variants"><summary>模型变体 · {model.variants.length}</summary>
  <p>以下是上方模型的细分，不重复计入合计。</p>
  {model.variants.map(v=><div key={v.model}><span>{v.model}</span><span>{exact(v.tokens)} tokens · {cost(v.cost)}</span></div>)}
 </details>:null;
}
export function ExactReadings({fixture}:{fixture:Fixture}) {
 return <details className="mb-exact"><summary>查看精确读数 · {fixture.row.models.length} 个模型</summary>
  {fixture.row.models.map(m=><div className="mb-exact-row" key={m.model}><span>{m.model}</span><span>{exact(m.tokens)} tokens · {cost(m.cost)}</span><Variants model={m}/></div>)}
 </details>;
}
export function Denominator({fixture}:{fixture:Fixture}) {
 return <p className="mb-denominator" data-denominator={fixture.row.tokens}>份额分母：该期已记录的 {exact(fixture.row.tokens)} tokens。不是套餐额度，也不是总账单。</p>;
}
