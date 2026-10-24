import {useRef,useState} from 'react';
import {isHomeUsageStyle,type HomeUsageStyle} from '../homeUsage';

export const homeStyleKey='tokenplan.homeUsagePreferences';
export type HomeStyleMode='uniform'|'custom';
export type HomeStylePreferences={mode:HomeStyleMode;style:HomeUsageStyle;customDefault:HomeUsageStyle;accounts:Record<string,HomeUsageStyle>;initialized:boolean};
export function readHomeStyles(storage:Pick<Storage,'getItem'>):HomeStylePreferences {
 const raw=storage.getItem(homeStyleKey);
 if(raw){
  const p=JSON.parse(raw);
  if(!p||!['uniform','custom'].includes(p.mode)||!isHomeUsageStyle(p.style)||!isHomeUsageStyle(p.customDefault)||typeof p.initialized!=='boolean'||!p.accounts||typeof p.accounts!=='object'||Array.isArray(p.accounts)||Object.values(p.accounts).some(v=>typeof v!=='string'||!isHomeUsageStyle(v)))throw new Error('Invalid Home styles');
  return p;
 }
 const legacy=storage.getItem('tokenplan.homeUsageStyle')??'bars';
 if(!isHomeUsageStyle(legacy))throw new Error('Invalid Home style');
 return {mode:'uniform',style:legacy,customDefault:legacy,accounts:{},initialized:false};
}
export function homeStyleFor(p:HomeStylePreferences,id:string):HomeUsageStyle {return p.mode==='uniform'?p.style:p.accounts[id]??p.customDefault;}
export function homeStyleMode(p:HomeStylePreferences,mode:HomeStyleMode):HomeStylePreferences {
 return {...p,mode,...mode==='custom'&&!p.initialized?{initialized:true,customDefault:p.style}:{}};
}
export function useHomeUsageStyle() {
 const [error,setError]=useState('');
 const [preference,setPreference]=useState<HomeStylePreferences>(()=>{
  try{return readHomeStyles(localStorage);}catch(e){console.error('Home styles could not be read',e);setError('Could not load the Home usage style. Choose a style to save it again.');return {mode:'uniform',style:'bars',customDefault:'bars',accounts:{},initialized:false};}
 });
 const current=useRef(preference);current.current=preference;
 const persist=(next:HomeStylePreferences)=>{localStorage.setItem(homeStyleKey,JSON.stringify(next));current.current=next;setPreference(next);setError('');};
 const change=(next:HomeStylePreferences)=>{try{persist(next);}catch(e){console.error('Home styles could not be saved',e);setError('Could not save. Try again.');}};
 return {...preference,error,styleFor:(id:string)=>homeStyleFor(preference,id),changeStyle:(style:HomeUsageStyle)=>change({...current.current,style}),changeMode:(mode:HomeStyleMode)=>change(homeStyleMode(current.current,mode)),changeAccountStyle:(id:string,style:HomeUsageStyle)=>change({...current.current,accounts:{...current.current.accounts,[id]:style}})};
}
