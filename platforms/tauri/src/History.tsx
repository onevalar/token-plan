import {useState} from 'react';
import {Button} from './components/arc/button/button';
import {Select} from './components/arc/select/select';
import {historyRows,type Account} from './desktop';
import type {Copy} from './copy';
export function History({accounts,t}:{accounts:Account[];t:Copy}) {
 const [showQuota,setShowQuota]=useState(false);
 const [family,setFamily]=useState('all');const [days,setDays]=useState('30');
 const families=[...new Map(accounts.map(a=>[a.family,a.name])).entries()];
 const cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(days)+1);
 const key=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
 const rows=historyRows(accounts,family).filter(d=>d.date>=key);
 return <section className="history"><h2>{t.history}</h2><p className="muted">{t.deviceHistory}</p>
 <div className="history-controls"><Select label={t.configure} value={family} onValueChange={setFamily} options={[{value:'all',label:t.all},...families.map(([value,label])=>({value,label}))]}/><Select label={t.history} value={days} onValueChange={setDays} options={[1,7,30].map(n=>({value:String(n),label:`${n}d`}))}/></div>
 {accounts.some(a=>a.historyPartial)&&<p role="status">{t.historyWarning}</p>}
 {rows.length?<div className="table-scroll"><table><thead><tr><th>{t.date}</th><th>{t.configure}</th><th>{t.tokens}</th><th>{t.cost}</th></tr></thead><tbody>{rows.map(r=><tr key={`${r.owner}-${r.date}`}><td>{r.date}</td><td>{r.provider}{r.account&&<small className="email">{r.account}</small>}</td><td>{r.tokens.toLocaleString()}</td><td>{r.cost==null?'—':`$${r.cost.toFixed(2)}`}</td></tr>)}</tbody></table></div>:<p>{t.noHistory}</p>}
 {accounts.some(a=>a.observations.length>0)&&<><Button variant="ghost" aria-expanded={showQuota} onClick={()=>setShowQuota(!showQuota)}>{t.quotaHistory}</Button>{showQuota&&<div className="table-scroll"><table><tbody>{accounts.filter(a=>family==='all'||a.family===family).flatMap(a=>a.observations.filter(o=>o.date.slice(0,10)>=key).slice(0,168).map(o=><tr key={`${a.id}-${o.date}-${o.label}`}><td>{new Date(o.date).toLocaleString()}</td><td>{a.name} {a.email}</td><td>{o.label}</td><td>{o.value==null?'—':`${o.value.toLocaleString(undefined,{maximumFractionDigits:2})}${o.unit==='percent'?'%':o.unit==='USD'?' USD':o.unit==='CNY'?' CNY':''}`}</td></tr>))}</tbody></table></div>}</>}
 </section>;
}
