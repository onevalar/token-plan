export const costReferenceKey='tokenplan.costReferences.v1';
export const maximumCostReference=1_000_000;
export const validCostReference=(value:number)=>Number.isSafeInteger(value)&&value>=0&&value<=maximumCostReference;
export function readCostReferences(raw:string|null):Record<string,number> {
 if(!raw)return {};
 const values=JSON.parse(raw);
 if(!values||typeof values!=='object'||Array.isArray(values)||Object.values(values).some(value=>typeof value!=='number'||!validCostReference(value)))throw new Error('Invalid cost references');
 return values;
}

/** Local presentation settings, never a quota, inferred budget or forecast. */
export function createCostReference(scope:string,range:string) {
 const key=JSON.stringify([scope,range]);
 let error=$state(''),stored:Record<string,number>={};
 try{stored=readCostReferences(localStorage.getItem(costReferenceKey));}
 catch(cause){console.error('Cost references could not be read',cause);error='Could not load the personal cost reference. Set it again to save.';}
 let budget=$state(stored[key]??0),saved=$state(false);
 const change=(value:number)=>{budget=value;saved=false;};
 const save=(value:number)=>{
  if(!validCostReference(value))return false;
  try{
   // Merge the latest device settings so simultaneously mounted module previews
   // cannot overwrite references saved for a different account or range.
   let current=stored;
   try{current=readCostReferences(localStorage.getItem(costReferenceKey));}catch{/* A new save repairs malformed settings, as in the source. */}
   const next={...current,[key]:value};
   localStorage.setItem(costReferenceKey,JSON.stringify(next));stored=next;
   budget=value;error='';saved=true;return true;
  }catch(cause){console.error('Cost reference could not be saved',cause);error='Could not save. Try again.';saved=false;return false;}
 };
 return {get budget(){return budget;},get error(){return error;},get saved(){return saved;},change,save};
}
