import {useEffect,useLayoutEffect,useRef} from 'react';

export const names=['现有身份行','分项资料','展开摘要'];
export function Picker({current,onChange}:{current:number;onChange:(value:number)=>void}) {
 const ref=useRef<HTMLElement>(null);
 useLayoutEffect(()=>{
  const move=()=>{
   const item=ref.current?.querySelector<HTMLElement>('[data-active]');
   const highlight=ref.current?.querySelector<HTMLElement>('.proto-picker-highlight');
   if(item&&highlight){highlight.style.width=`${item.offsetWidth}px`;highlight.style.transform=`translateX(${item.offsetLeft}px)`;}
  };
  move();window.addEventListener('resize',move);return()=>window.removeEventListener('resize',move);
 },[current]);
 useEffect(()=>{
  let second=0;
  const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>ref.current?.setAttribute('data-ready',''));});
  return()=>{cancelAnimationFrame(first);cancelAnimationFrame(second);};
 },[]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement;
   if(event.defaultPrevented||event.isComposing||event.metaKey||event.ctrlKey||event.altKey||target.isContentEditable||target.closest('input,textarea,select,[role="combobox"],[role="listbox"],[role="switch"]'))return;
   const digit=Number(event.key);
   let next:number|undefined;
   if(digit>=1&&digit<=names.length)next=digit-1;
   else if(event.key==='ArrowRight')next=(current+1)%names.length;
   else if(event.key==='ArrowLeft')next=(current+names.length-1)%names.length;
   if(next===undefined)return;
   event.preventDefault();
   // Replacing an open disclosure must not drop keyboard focus onto the document.
   if(target.closest('.ap-window'))ref.current?.querySelectorAll<HTMLButtonElement>('button')[next]?.focus();
   onChange(next);
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[current,onChange]);
 return <nav ref={ref} className="proto-picker" aria-label="原型变体">
  <span className="proto-picker-highlight" aria-hidden="true"/>
  {names.map((name,i)=><button type="button" className="proto-picker-item" key={name} data-active={current===i?'':undefined} aria-current={current===i?'true':undefined} onClick={()=>onChange(i)}>{name}</button>)}
 </nav>;
}
