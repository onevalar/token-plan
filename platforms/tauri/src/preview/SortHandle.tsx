import {useEffect,useRef,useState} from 'react';
import {flushSync} from 'react-dom';
import {GripVertical} from 'lucide-react';
import {Button} from '../components/arc/button/button';
import {motionTokens} from '../components/arc/motion-tokens';
import {sortPosition,type SortBox} from './sortGesture';

type Gesture={
 list:HTMLElement;row:HTMLElement;rows:HTMLElement[];boxes:SortBox[];from:number;
 saved:{transform:string;transition:string}[];startY:number;y:number;x:number;scroll:number;
 page:HTMLElement|null;active:boolean;settling:boolean;frame:number;timer:number;
 to:number;landing:number;duration:number;release:()=>void;
};

/** Move the actual row, reserving its space while siblings slide around it.
 * Pointer capture, scrolling and keyboard input work in all three webviews. */
export function SortHandle({id,label,disabled,onMove}:{id:string;label:string;disabled:boolean;onMove:(target:string)=>void}) {
 const gesture=useRef<Gesture|null>(null),move=useRef(onMove);move.current=onMove;
 const [dragging,setDragging]=useState(false);
 const cleanup=(render=true)=>{
  const g=gesture.current;if(!g)return;gesture.current=null;
  cancelAnimationFrame(g.frame);clearTimeout(g.timer);g.release();
  g.rows.forEach((row,i)=>{row.style.transform=g.saved[i].transform;row.style.transition=g.saved[i].transition;});
  delete g.row.dataset.sortDragging;delete g.list.dataset.sortActive;
  if(render)setDragging(false);
 };
 const finish=(cancel=false)=>{
  const g=gesture.current;if(!g||g.settling)return;
  if(!g.active){cleanup();return;}
  g.settling=true;cancelAnimationFrame(g.frame);
  const target=!cancel&&g.to!==g.from?g.rows[g.to].dataset.sortId:null;
  g.row.style.transition=`transform ${g.duration}ms cubic-bezier(${motionTokens.ease.standard.join(',')})`;
  g.row.style.transform=`translateY(${cancel?0:g.landing}px)`;
  if(cancel)g.rows.forEach((row,i)=>{if(i!==g.from)row.style.transform='translateY(0px)';});
  const commit=()=>{cleanup();if(target)flushSync(()=>move.current(target));};
  if(g.duration)g.timer=window.setTimeout(commit,g.duration);else commit();
 };
 const draw=()=>{
  const g=gesture.current;if(!g||g.settling)return;
  const delta=g.y-g.startY+(g.page?.scrollTop??0)-g.scroll;
  if(!g.active&&Math.abs(delta)<5)return;
  if(!g.active){g.active=true;g.list.dataset.sortActive='true';g.row.dataset.sortDragging='true';setDragging(true);
   g.rows.forEach((row,i)=>{row.style.transition=i===g.from?'none':`transform ${g.duration}ms cubic-bezier(${motionTokens.ease.standard.join(',')})`;});}
  const position=sortPosition(g.boxes,g.from,delta);g.to=position.to;g.landing=position.landing;
  g.rows.forEach((row,i)=>{row.style.transform=`translateY(${i===g.from?position.y:position.offsets[i]}px)`;});
 };
 const scrollFrame=()=>{
  const g=gesture.current;if(!g||g.settling)return;
  if(g.active&&g.page){const bounds=g.page.getBoundingClientRect();const edge=40;
   const speed=g.y>bounds.bottom-edge?Math.min(10,(g.y-bounds.bottom+edge)/4):g.y<bounds.top+edge?-Math.min(10,(bounds.top+edge-g.y)/4):0;
   if(speed){g.page.scrollTop+=speed;draw();}}
  g.frame=requestAnimationFrame(scrollFrame);
 };
 useEffect(()=>()=>cleanup(false),[]);
 useEffect(()=>{if(disabled&&gesture.current&&!gesture.current.settling)finish(true);},[disabled]);
 return <Button type="button" variant="ghost" size="sm" className="sort-handle" aria-label={label} disabled={disabled} data-dragging={dragging}
  onPointerDown={e=>{
   if(e.button!==0||gesture.current)return;
   const list=e.currentTarget.closest<HTMLElement>('[data-sort-list]');if(!list||list.dataset.sortActive)return;
   const rows=Array.from(list.querySelectorAll<HTMLElement>('[data-sort-id]')),from=rows.findIndex(row=>row.dataset.sortId===id);if(from<0)return;
   const page=list.closest<HTMLElement>('.preview-page');
   const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(true);}};
   const cancel=()=>finish(true),scroll=()=>draw();
   document.addEventListener('keydown',escape,true);window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);page?.addEventListener('scroll',scroll);
   gesture.current={list,row:rows[from],rows,from,boxes:rows.map(row=>{const b=row.getBoundingClientRect();return{top:b.top,height:b.height};}),saved:rows.map(row=>({transform:row.style.transform,transition:row.style.transition})),startY:e.clientY,y:e.clientY,x:e.clientX,scroll:page?.scrollTop??0,page,active:false,settling:false,frame:0,timer:0,to:from,landing:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:motionTokens.duration.fast*1000,
    release:()=>{document.removeEventListener('keydown',escape,true);window.removeEventListener('blur',cancel);window.removeEventListener('resize',cancel);page?.removeEventListener('scroll',scroll);}};
   e.currentTarget.setPointerCapture(e.pointerId);gesture.current.frame=requestAnimationFrame(scrollFrame);
  }}
  onPointerMove={e=>{const g=gesture.current;if(g){g.y=e.clientY;g.x=e.clientX;draw();}}}
  onPointerUp={()=>{const g=gesture.current;if(!g)return;const bounds=g.list.getBoundingClientRect();finish(g.x<bounds.left-30||g.x>bounds.right+30);}}
  onPointerCancel={()=>finish(true)} onLostPointerCapture={()=>{if(!gesture.current?.settling)finish(true);}}
  onKeyDown={e=>{if(gesture.current||e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const rows=Array.from(e.currentTarget.closest('[data-sort-list]')?.querySelectorAll<HTMLElement>('[data-sort-id]')??[]);const at=rows.findIndex(row=>row.dataset.sortId===id);const next=rows[at+(e.key==='ArrowUp'?-1:1)]?.dataset.sortId;if(next)onMove(next);}}><GripVertical size={17} aria-hidden="true"/></Button>;
}
