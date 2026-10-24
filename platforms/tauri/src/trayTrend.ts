import type {Account} from './desktop';

const DAYS=14,DAY=86_400_000;
export type TokenTrend={dates:string[];values:(number|null)[];partial:boolean;invalid:boolean};

/** Daily token records, not quota observations. A missing calendar day stays a gap. */
function dailyTokens(account:Account,now:number):TokenTrend {
 const local=new Date(now),end=Date.UTC(local.getFullYear(),local.getMonth(),local.getDate()),start=end-(DAYS-1)*DAY;
 const dates=Array.from({length:DAYS},(_,i)=>new Date(start+i*DAY).toISOString().slice(0,10));
 const values:(number|null)[]=Array(DAYS).fill(null),seen=new Set<number>();let invalid=false;
 for(const row of account.history){
  const time=Date.parse(`${row.date}T00:00:00Z`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(row.date)||!Number.isFinite(time)||new Date(time).toISOString().slice(0,10)!==row.date){invalid=true;continue;}
  const index=(time-start)/DAY;
  if(index<0||index>=DAYS)continue;
  if(seen.has(index)||!Number.isSafeInteger(row.tokens)||row.tokens<0){values[index]=null;invalid=true;seen.add(index);continue;}
  seen.add(index);values[index]=row.tokens;
 }
 return {dates,values,partial:account.historyPartial,invalid};
}

/** Device records appear once, on the first visible, pinned account with usable records. */
export function trayTrends(accounts:Account[],now:number):Map<string,TokenTrend> {
 const seen=new Set<string>(),result=new Map<string,TokenTrend>();
 for(const account of accounts){
  if(!account.enabled||!account.tray||!account.metrics.some(m=>m.pinned)||account.historyScope==='device'&&seen.has(account.family))continue;
  const trend=dailyTokens(account,now);
  result.set(account.id,trend);
  if(trend.values.some(value=>value!=null)&&account.historyScope==='device')seen.add(account.family);
 }
 return result;
}

/** Native menu-bar readouts use the same compact, locale-independent token unit. */
export function tokenReading(value:number|null):string {
 if(value==null)return '—';
 for(const [scale,suffix] of [[1e9,'B'],[1e6,'M'],[1e3,'k']] as const){
  if(value>=scale)return `${(value/scale).toFixed(1).replace(/\.0$/,'')}${suffix}`;
 }
 return String(value);
}
