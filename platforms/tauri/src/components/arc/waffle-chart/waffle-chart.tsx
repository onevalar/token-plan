import type {CSSProperties} from 'react';
import styles from './waffle-chart.module.css';

type WaffleCategory={key:string;value:number;color:string};
// Arc's largest-remainder allocation keeps whole-cell counts adding up to 100.
function allocate(data:WaffleCategory[],total:number) {
 if(total<=0)return data.map(()=>0);
 const exact=data.map(item=>Math.max(0,item.value)/total*100),counts=exact.map(Math.floor);
 let left=100-counts.reduce((sum,count)=>sum+count,0);
 const order=exact.map((value,index)=>({index,rest:value-Math.floor(value)})).sort((a,b)=>b.rest-a.rest);
 for(let k=0;left>0&&k<order.length;k++,left--)counts[order[k].index]++;
 return counts;
}

/** Read-only Arc WaffleChart: fixed 100 cells, bottom-left column fill, no selection or motion. */
export function WaffleChart({data,label}:{data:WaffleCategory[];label:string}) {
 const total=data.reduce((sum,item)=>sum+Math.max(0,item.value),0),counts=allocate(data,total);
 let slot=0;
 return <div className={styles.grid} role="img" aria-label={label}>{data.flatMap((item,index)=>Array.from({length:counts[index]},()=>{
  const at=slot++;
  return <span key={at} className={styles.cell} aria-hidden="true" data-category={item.key} style={{gridColumn:Math.floor(at/10)+1,gridRow:10-at%10,'--cell':item.color} as CSSProperties}/>;
 }))}</div>;
}
