// Adapted from free Arc Timeline: https://uiarc.dev/r/timeline.json (2026-10-22).
// Retains marker/segment/trigger/detail composition and arrow-key navigation.
// Date-only daily totals replace events: no invented timestamps, actor, relative time,
// live announcements, auto-scroll, reveal animations, avatars, or status tones.
import {useId,useRef,useState,type KeyboardEvent,type ReactNode} from 'react';
import {ChevronDown} from 'lucide-react';
import styles from './timeline.module.css';

export interface DayItem {id:string;date:ReactNode;summary:ReactNode;meta:ReactNode;detail:ReactNode}
export function DayTimeline({items}:{items:DayItem[]}) {
 const ref=useRef<HTMLDivElement>(null),prefix=useId();
 const [expanded,setExpanded]=useState(new Set<string>());
 function onKeyDown(event:KeyboardEvent<HTMLDivElement>) {
  if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
  const triggers=[...(ref.current?.querySelectorAll<HTMLButtonElement>('[data-timeline-trigger]')??[])];
  const index=triggers.indexOf(document.activeElement as HTMLButtonElement);
  if(index<0)return;
  event.preventDefault();
  const next=event.key==='Home'?0:event.key==='End'?triggers.length-1:Math.min(Math.max(index+(event.key==='ArrowDown'?1:-1),0),triggers.length-1);
  triggers[next]?.focus();
 }
 return <div ref={ref} className={styles.root} role="region" aria-label="按已记录日期排列" onKeyDown={onKeyDown}>
  <ol className={styles.list}>{items.map((item,index)=>{
   const open=expanded.has(item.id),detailId=`${prefix}-${item.id}`;
   return <li key={item.id} className={styles.item} data-day={item.id}>
    <span className={styles.marker} aria-hidden="true"/>
    {index<items.length-1&&<span className={styles.segment} aria-hidden="true"/>}
    <div className={styles.content}>
     <button type="button" className={styles.trigger} data-timeline-trigger="" aria-expanded={open} aria-controls={open?detailId:undefined} onClick={()=>setExpanded(current=>{const next=new Set(current);if(open)next.delete(item.id);else next.add(item.id);return next;})}>
      <span className={styles.text}><span className={styles.date}>{item.date}</span><span className={styles.summary}>{item.summary}</span><span className={styles.meta}>{item.meta}</span></span>
      <ChevronDown size={16} aria-hidden="true" className={styles.chevron} data-open={open}/>
     </button>
     {open&&<div id={detailId} className={styles.detail}>{item.detail}</div>}
    </div>
   </li>;
  })}</ol>
 </div>;
}
