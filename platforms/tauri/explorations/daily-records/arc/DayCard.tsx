// Adapted from free Arc Expandable Card: https://uiarc.dev/r/expandable-card.json.
// Retains native trigger, spring-height panel, inert close, and Escape focus return.
// Fixed full width: removes width morph/measurement and rolling text. Adds a static
// summary slot inside the trigger, so the day's readings remain visible when closed.
import {useId,useRef,useState,type ReactNode} from 'react';
import {motion,useReducedMotion} from 'motion/react';
import {ChevronDown} from 'lucide-react';
import {motionTokens} from '../../../src/components/arc/lib/motion-tokens';
import styles from './card.module.css';

export function DayCard({date,title,summary,children}:{date:string;title:ReactNode;summary:(expanded:boolean)=>ReactNode;children:ReactNode}) {
 const [expanded,setExpanded]=useState(false);
 const trigger=useRef<HTMLButtonElement>(null),panelId=useId();
 const reduced=useReducedMotion();
 const transition=reduced?{duration:0}:motionTokens.spring.smooth;
 return <article className={styles.card} data-day={date} data-expanded={expanded} onKeyDown={event=>{
  if(event.defaultPrevented||event.key!=='Escape'||!expanded)return;
  event.preventDefault();setExpanded(false);trigger.current?.focus();
 }}>
  <button ref={trigger} type="button" className={styles.trigger} aria-expanded={expanded} aria-controls={panelId} onClick={()=>setExpanded(!expanded)}>
   <span className={styles.heading}>{title}<motion.span className={styles.arrow} initial={false} animate={{rotate:expanded?180:0}} transition={transition}><ChevronDown size={16} aria-hidden="true"/></motion.span></span>
   {summary(expanded)}
  </button>
  <motion.div id={panelId} className={styles.panel} inert={!expanded} initial={false} animate={{height:expanded?'auto':0}} transition={transition}>
   <div className={styles.panelInner}>{children}</div>
  </motion.div>
 </article>;
}
