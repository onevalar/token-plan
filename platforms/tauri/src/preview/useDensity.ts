import {useState} from 'react';

export type Density='compact'|'comfortable';
const key='tokenplan.homeDensity';
// Local to this device; preserve the earlier macOS preview choice when upgrading.
export function useDensity() {
 const [density,setDensity]=useState<Density>(()=>{
  try {return (localStorage.getItem(key)??localStorage.getItem('tokenplan.mac.homeDensity'))==='comfortable'?'comfortable':'compact';}
  catch {return 'compact';}
 });
 const [failed,setFailed]=useState(false);
 const changeDensity=(value:Density)=>{
  try {localStorage.setItem(key,value);setDensity(value);setFailed(false);}
  catch {setFailed(true);}
 };
 return {density,changeDensity,failed};
}
