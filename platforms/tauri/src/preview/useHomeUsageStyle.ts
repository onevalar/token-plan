import {useState} from 'react';
import {isHomeUsageStyle,type HomeUsageStyle} from '../homeUsage';

const key='tokenplan.homeUsageStyle';
type Preference={style:HomeUsageStyle;error:string};
export function useHomeUsageStyle() {
 const [preference,setPreference]=useState<Preference>(()=>{
  try {
   const value=localStorage.getItem(key);
   if(value!==null&&!isHomeUsageStyle(value))throw new Error('Unknown Home usage style');
   return {style:value??'bars',error:''};
  }catch(error){
   console.error('Home usage style could not be read',error);
   return {style:'bars',error:'Could not load the Home usage style. Choose a style to save it again.'};
  }
 });
 const changeStyle=(style:HomeUsageStyle)=>{
  try {localStorage.setItem(key,style);setPreference({style,error:''});}
  catch(error){console.error('Home usage style could not be saved',error);setPreference(previous=>({...previous,error:'Could not save. Try again.'}));}
 };
 return {...preference,changeStyle};
}
