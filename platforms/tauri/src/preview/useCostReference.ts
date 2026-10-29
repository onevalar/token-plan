import {useRef,useState} from 'react';

export const costReferenceKey='tokenplan.costReferences.v1';
export const maximumCostReference=1_000_000;
export const validCostReference=(value:number)=>Number.isSafeInteger(value)&&value>=0&&value<=maximumCostReference;
export function readCostReferences(raw:string|null):Record<string,number> {
 if(!raw)return {};
 const values=JSON.parse(raw);
 if(!values||typeof values!=='object'||Array.isArray(values)||Object.values(values).some(value=>typeof value!=='number'||!validCostReference(value)))throw new Error('Invalid cost references');
 return values;
}
/** References are user-defined, local presentation settings, never provider quotas or inferred budgets. */
export function useCostReference(scope:string,range:string) {
 const key=JSON.stringify([scope,range]),[error,setError]=useState('');
 const [stored,setStored]=useState(()=>{
  try{return readCostReferences(localStorage.getItem(costReferenceKey));}
  catch(error){console.error('Cost references could not be read',error);setError('Could not load the personal cost reference. Set it again to save.');return {};}
 });
 const current=useRef(stored);current.current=stored;
 const [budget,setBudget]=useState(stored[key]??0),[saved,setSaved]=useState(false);
 const change=(value:number)=>{setBudget(value);setSaved(false);};
 const save=(value:number)=>{
  if(!validCostReference(value))return false;
  try{
   const next={...current.current,[key]:value};
   localStorage.setItem(costReferenceKey,JSON.stringify(next));current.current=next;setStored(next);setBudget(value);setError('');setSaved(true);return true;
  }catch(error){console.error('Cost reference could not be saved',error);setError('Could not save. Try again.');setSaved(false);return false;}
 };
 return {budget,change,save,error,saved};
}
