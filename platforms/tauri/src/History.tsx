import {Fragment,useState} from 'react';
import {Button} from './components/arc/button/button';
import {Select} from './components/arc/select/select';
import {historyRows,type Account} from './desktop';
import type {Copy} from './copy';
import {providerText} from './providerText';
export function History({accounts,t,language,synced=false}:{accounts:Account[];t:Copy;language:string;synced?:boolean}) {
 const [showQuota,setShowQuota]=useState(false);const [expanded,setExpanded]=useState<string|null>(null);
 const [family,setFamily]=useState('all');const [days,setDays]=useState('30');
 const families=[...new Map(accounts.map(a=>[a.family,a.name])).entries()];
 const cutoff=new Date();cutoff.setDate(cutoff.getDate()-Number(days)+1);
 const key=`${cutoff.getFullYear()}-${String(cutoff.getMonth()+1).padStart(2,'0')}-${String(cutoff.getDate()).padStart(2,'0')}`;
 const rows=historyRows(accounts,family).filter(d=>d.date>=key);
 return <section className="history"><h2>{t.history}</h2><p className="muted">{synced?providerText('Shares usage history through iCloud, so you can see one combined summary for all your Macs.',language):t.deviceHistory}</p>
 <div className="history-controls"><Select label={t.configure} value={family} onValueChange={setFamily} options={[{value:'all',label:t.all},...families.map(([value,label])=>({value,label}))]}/><Select label={t.history} value={days} onValueChange={setDays} options={[1,7,30].map(n=>({value:String(n),label:`${n}d`}))}/></div>
 {accounts.some(a=>a.historyPartial)&&<p role="status">{t.historyWarning}</p>}
 {rows.length?<div className="table-scroll"><table><thead><tr><th>{t.date}</th><th>{t.configure}</th><th>{t.tokens}</th><th>{t.cost}</th></tr></thead><tbody>{rows.map(r=><Fragment key={`${r.owner}-${r.date}`}><tr><td>{r.models.length?<Button variant="ghost" aria-expanded={expanded===`${r.owner}-${r.date}`} onClick={()=>setExpanded(expanded===`${r.owner}-${r.date}`?null:`${r.owner}-${r.date}`)}>{r.date} {expanded===`${r.owner}-${r.date}`?"−":"+"}</Button>:r.date}</td><td>{r.provider}{r.account&&<small className="email">{r.account}</small>}</td><td>{r.tokens.toLocaleString()}</td><td>{r.cost==null?'—':`$${r.cost.toFixed(2)}`}</td></tr>{expanded===`${r.owner}-${r.date}`&&r.models.map(m=><tr className="model-history-row" key={m.model}><td></td><td>{providerText(m.model,language)}{m.variants.length>0&&<details><summary>{providerText("Model Breakdown",language)}</summary>{m.variants.map(v=><p key={v.model}>{v.model} · {v.tokens.toLocaleString()} token · {v.cost==null?"—":`$${v.cost.toFixed(2)}`}</p>)}</details>}</td><td>{m.tokens.toLocaleString()}</td><td>{m.cost==null?"—":`$${m.cost.toFixed(2)}`}</td></tr>)}</Fragment>)}</tbody></table></div>:<p>{t.noHistory}</p>}
 {accounts.some(a=>a.observations.length>0)&&<><Button variant="ghost" aria-expanded={showQuota} onClick={()=>setShowQuota(!showQuota)}>{t.quotaHistory}</Button>{showQuota&&<div className="table-scroll"><table><tbody>{accounts.filter(a=>family==='all'||a.family===family).flatMap(a=>a.observations.filter(o=>o.date.slice(0,10)>=key).slice(0,168).map(o=><tr key={`${a.id}-${o.date}-${o.label}`}><td>{new Date(o.date).toLocaleString(language)}</td><td>{a.name} {a.email}</td><td>{providerText(o.label,language)}</td><td>{o.value==null?'—':`${o.value.toLocaleString(undefined,{maximumFractionDigits:2})}${o.unit==='percent'?'%':o.unit==='USD'?' USD':o.unit==='CNY'?' CNY':''}`}</td></tr>))}</tbody></table></div>}</>}
 </section>;
}
