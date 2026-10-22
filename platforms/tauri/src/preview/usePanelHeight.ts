import {useLayoutEffect} from 'react';
import {invoke} from '@tauri-apps/api/core';

// Measure an intrinsically sized child, never the scroll viewport: that allows shrinking.
export function usePanelHeight(route:number,state:unknown,density:string) {
 useLayoutEffect(()=>{
  const page=document.querySelector<HTMLElement>('.preview-page:not([hidden])');
  const content=page?.querySelector<HTMLElement>('.page-content');
  if(!page||!content)return;
  let frame=0,last=-1;
  const measure=()=>{
   cancelAnimationFrame(frame);
   frame=requestAnimationFrame(()=>{
    const style=getComputedStyle(page);
    const chrome=Array.from(document.querySelector('.mac-preview')?.children??[])
     .filter(e=>!e.matches('.preview-header,.page-stack'))
     .reduce((sum,e)=>{const s=getComputedStyle(e);return sum+e.getBoundingClientRect().height+parseFloat(s.marginTop)+parseFloat(s.marginBottom);},0);
    const height=Math.ceil(54+content.getBoundingClientRect().height+parseFloat(style.paddingTop)+parseFloat(style.paddingBottom)+chrome);
    if(height!==last){last=height;void invoke('panel_content_height',{height}).catch(e=>console.error('Panel resize failed',e));}
   });
  };
  const observer=new ResizeObserver(measure);observer.observe(content);measure();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();};
 },[route,state,density]);
}
