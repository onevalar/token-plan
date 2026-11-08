<script lang="ts">
 import {onDestroy,flushSync} from 'svelte';
 import {GripVertical} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {sortPosition,type SortBox} from '../../preview/sortGesture';
 let {id,label,disabled=false,onMove}:{id:string;label:string;disabled?:boolean;onMove:(target:string)=>void}=$props();
 type Gesture={list:HTMLElement;row:HTMLElement;rows:HTMLElement[];boxes:SortBox[];from:number;saved:{transform:string;transition:string}[];startY:number;y:number;x:number;scroll:number;page:HTMLElement|null;active:boolean;settling:boolean;frame:number;timer:number;to:number;landing:number;duration:number;release:()=>void};
 let gesture:Gesture|null=null,dragging=$state(false);
 function cleanup(){const g=gesture;if(!g)return;gesture=null;cancelAnimationFrame(g.frame);clearTimeout(g.timer);g.release();g.rows.forEach((row,i)=>{row.style.transform=g.saved[i].transform;row.style.transition=g.saved[i].transition;});delete g.row.dataset.sortDragging;delete g.list.dataset.sortActive;dragging=false;}
 function finish(cancel=false){
  const g=gesture;if(!g||g.settling)return;if(!g.active){cleanup();return;}
  g.settling=true;cancelAnimationFrame(g.frame);
  const target=!cancel&&g.to!==g.from?g.rows[g.to].dataset.sortId:null;
  g.row.style.transition=`transform ${g.duration}ms cubic-bezier(.22,1,.36,1)`;g.row.style.transform=`translateY(${cancel?0:g.landing}px)`;
  if(cancel)g.rows.forEach((row,i)=>{if(i!==g.from)row.style.transform='translateY(0px)';});
  const commit=()=>{cleanup();if(target)flushSync(()=>onMove(target));};if(g.duration)g.timer=window.setTimeout(commit,g.duration);else commit();
 }
 function draw(){
  const g=gesture;if(!g||g.settling)return;const delta=g.y-g.startY+(g.page?.scrollTop??0)-g.scroll;
  if(!g.active&&Math.abs(delta)<5)return;
  if(!g.active){g.active=true;g.list.dataset.sortActive='true';g.row.dataset.sortDragging='true';dragging=true;g.rows.forEach((row,i)=>row.style.transition=i===g.from?'none':`transform ${g.duration}ms cubic-bezier(.22,1,.36,1)`);}
  const position=sortPosition(g.boxes,g.from,delta);g.to=position.to;g.landing=position.landing;g.rows.forEach((row,i)=>row.style.transform=`translateY(${i===g.from?position.y:position.offsets[i]}px)`);
 }
 function scrollFrame(){const g=gesture;if(!g||g.settling)return;if(g.active&&g.page){const bounds=g.page.getBoundingClientRect(),edge=40;const speed=g.y>bounds.bottom-edge?Math.min(10,(g.y-bounds.bottom+edge)/4):g.y<bounds.top+edge?-Math.min(10,(bounds.top+edge-g.y)/4):0;if(speed){g.page.scrollTop+=speed;draw();}}g.frame=requestAnimationFrame(scrollFrame);}
 onDestroy(cleanup);
 $effect(()=>{if(disabled&&gesture&&!gesture.settling)finish(true);});
 function pointerDown(e:PointerEvent & {currentTarget:EventTarget & HTMLElement}){
  if(e.button!==0||gesture)return;const list=e.currentTarget.closest<HTMLElement>('[data-sort-list]');if(!list||list.dataset.sortActive)return;
  const rows=Array.from(list.querySelectorAll<HTMLElement>('[data-sort-id]')),from=rows.findIndex(row=>row.dataset.sortId===id);if(from<0)return;
  const page=list.closest<HTMLElement>('.preview-page');
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();finish(true);}};
  const cancel=()=>finish(true),scroll=()=>draw();document.addEventListener('keydown',escape,true);window.addEventListener('blur',cancel);window.addEventListener('resize',cancel);page?.addEventListener('scroll',scroll);
  gesture={list,row:rows[from],rows,from,boxes:rows.map(row=>{const b=row.getBoundingClientRect();return {top:b.top,height:b.height};}),saved:rows.map(row=>({transform:row.style.transform,transition:row.style.transition})),startY:e.clientY,y:e.clientY,x:e.clientX,scroll:page?.scrollTop??0,page,active:false,settling:false,frame:0,timer:0,to:from,landing:0,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:160,release:()=>{document.removeEventListener('keydown',escape,true);window.removeEventListener('blur',cancel);window.removeEventListener('resize',cancel);page?.removeEventListener('scroll',scroll);}};
  e.currentTarget.setPointerCapture(e.pointerId);gesture.frame=requestAnimationFrame(scrollFrame);
 }
</script>
<Button type="button" variant="ghost" size="sm" class="sort-handle" aria-label={label} {disabled} data-dragging={dragging}
 onpointerdown={pointerDown} onpointermove={e=>{if(gesture){gesture.y=e.clientY;gesture.x=e.clientX;draw();}}}
 onpointerup={()=>{const g=gesture;if(!g)return;const bounds=g.list.getBoundingClientRect();finish(g.x<bounds.left-30||g.x>bounds.right+30);}}
 onpointercancel={()=>finish(true)} onlostpointercapture={()=>{if(!gesture?.settling)finish(true);}}
 onkeydown={e=>{if(gesture||e.key!=='ArrowUp'&&e.key!=='ArrowDown')return;e.preventDefault();const rows=Array.from(e.currentTarget.closest('[data-sort-list]')?.querySelectorAll<HTMLElement>('[data-sort-id]')??[]),at=rows.findIndex(row=>row.dataset.sortId===id),next=rows[at+(e.key==='ArrowUp'?-1:1)]?.dataset.sortId;if(next)onMove(next);}}><GripVertical size={17} aria-hidden="true"/></Button>
