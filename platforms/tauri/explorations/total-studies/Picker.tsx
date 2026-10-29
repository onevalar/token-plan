import {useEffect,useLayoutEffect,useRef} from 'react';
import {families} from './catalog';
import './picker.css';

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
  const stage=document.querySelector('.ts-stage');
  const place=()=>{
   const bounds=stage?.getBoundingClientRect();
   const overlaps=!!bounds&&bounds.top<innerHeight-24&&bounds.bottom>innerHeight-64;
   if(ref.current)ref.current.dataset.position=overlaps?'top':'bottom';
  };
  const observer=new ResizeObserver(place);if(stage)observer.observe(stage);
  place();window.addEventListener('resize',place);window.addEventListener('scroll',place,{passive:true});
  return()=>{observer.disconnect();window.removeEventListener('resize',place);window.removeEventListener('scroll',place);};
 },[]);
 useEffect(()=>{
  const key=(event:KeyboardEvent)=>{
   const target=event.target as HTMLElement;
   if(event.defaultPrevented||event.isComposing||event.metaKey||event.ctrlKey||event.altKey||target.isContentEditable||target.closest('input,textarea,select,[role="combobox"],[role="listbox"],[role="switch"],[role="slider"]'))return;
   const digit=Number(event.key);
   if(digit>=1&&digit<=families.length){event.preventDefault();onChange(digit-1);}
   else if(event.key==='ArrowRight'){event.preventDefault();onChange((current+1)%families.length);}
   else if(event.key==='ArrowLeft'){event.preventDefault();onChange((current+families.length-1)%families.length);}
  };
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[current,onChange]);
 return <nav ref={ref} className="proto-picker" aria-label="五条设计路线">
  <span className="proto-picker-highlight" aria-hidden="true"/>
  {families.map((family,i)=><button type="button" className="proto-picker-item" key={family.name} data-active={current===i?'':undefined} aria-current={current===i?'true':undefined} onClick={()=>onChange(i)}>{family.name}</button>)}
 </nav>;
}
