import {useState} from 'react';
import {ChevronDown,ChevronRight} from 'lucide-react';
import {Button} from '../../src/components/arc/button/button';
import {money,number,type Row} from './data';

// Exact inner daily-record disclosure structure from preview/HistoryPage.tsx.
// Reset by the parent when another day opens; no model chart or new source attribution.
export function Entries({rows,modelRow,setModelRow}:{rows:Row[];modelRow:string|null;setModelRow:(owner:string|null)=>void}) {
 return <div className="day-entries">{rows.map(r=><div className="history-entry" key={r.owner}>
  <Button variant="ghost" size="sm" className="row-button entry-trigger" disabled={!r.models.length} aria-expanded={modelRow===r.owner} onClick={()=>setModelRow(modelRow===r.owner?null:r.owner)}>
   <span className="record-label">{r.provider}{r.account&&<small>{r.account}</small>}</span><span className="record-value">{money(r.cost)}<small>{number(r.tokens)} token</small></span>{r.models.length>0&&(modelRow===r.owner?<ChevronDown size={14}/>:<ChevronRight size={14}/>)}
  </Button>
  {modelRow===r.owner&&r.models.map(m=><div className="model-record" key={m.model}><span>{m.model}</span><span>{money(m.cost)}<small>{number(m.tokens)} token</small></span>{m.variants.length>0&&<details><summary>模型细分</summary>{m.variants.map(v=><p key={v.model}>{v.model} · {number(v.tokens)} token · {money(v.cost)}</p>)}</details>}</div>)}
 </div>)}</div>;
}
export function IndependentEntries({rows}:{rows:Row[]}) {
 const [modelRow,setModelRow]=useState<string|null>(null);
 return <Entries rows={rows} modelRow={modelRow} setModelRow={setModelRow}/>;
}
