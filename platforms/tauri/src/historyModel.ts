import {historyRows,type Account} from './desktop';
export function dateKey(date:Date) {
 return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function historyBounds(range:string,now=new Date()) {
 const end=new Date(now),start=new Date(now);
 if(range==='yesterday'){start.setDate(start.getDate()-1);end.setDate(end.getDate()-1);}
 else start.setDate(start.getDate()-Number(range)+1);
 return {start:dateKey(start),end:dateKey(end)};
}
export function historyRange(accounts:Account[],family:string,range:string,now=new Date()) {
 const {start,end}=historyBounds(range,now);
 return historyRows(accounts,family).filter(r=>r.date>=start&&r.date<=end);
}
export function summarizeHistory(rows:ReturnType<typeof historyRows>) {
 const costs=rows.filter(r=>r.cost!=null);
 return {tokens:rows.reduce((sum,r)=>sum+r.tokens,0),cost:costs.length?costs.reduce((sum,r)=>sum+r.cost!,0):null};
}
export const historyColor=(name:string)=>({Claude:'#d87859',Codex:'#888c95',Antigravity:'#4989e9',OpenCode:'#9982ce',Amp:'#45a695'}[name]??'#8194a5');
