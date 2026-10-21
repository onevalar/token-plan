import {useState} from 'react';

export type Density='compact'|'comfortable';
const key='tokenplan.mac.homeDensity';
// This presentation preference belongs to this Mac's webview, never to a cloud account.
export function useDensity() {
 const [density,setDensity]=useState<Density>(()=>{
  try {return localStorage.getItem(key)==='comfortable'?'comfortable':'compact';}
  catch {return 'compact';}
 });
 const [failed,setFailed]=useState(false);
 const changeDensity=(value:Density)=>{
  try {localStorage.setItem(key,value);setDensity(value);setFailed(false);}
  catch {setFailed(true);}
 };
 return {density,changeDensity,failed};
}
