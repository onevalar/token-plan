import {largeDesktop} from './largeDesktop';
import {dateKey} from '../../src/historyModel';

/** Synthetic, non-sensitive records with two full periods and opposing source changes. */
export function statisticsDesktop(now=new Date(),scenario:'complete'|'partial'|'unknown'|'zero'='complete') {
 const state=largeDesktop(now);
 state.accounts=[state.accounts[0],state.accounts[2],state.accounts[5]];
 state.accounts.forEach((account,index)=>{
  account.historyScope='account';account.historyPartial=false;account.fetchedAt=now.toISOString();
  account.history=Array.from({length:60},(_,day)=>{
   const date=new Date(now);date.setDate(date.getDate()-day);
   const multiplier=day<30?[1.5,.7,1.1][index]:1;
   const tokens=scenario==='zero'?0:Math.round((index+1)*125000*multiplier+(day%7)*7010);
   const cost=scenario==='unknown'?null:scenario==='zero'?0:(index+1)*.12*multiplier+(day%7)*.007;
   return {date:dateKey(date),tokens,cost,models:[{model:['claude-fable','codex-astra','amp-astra'][index],tokens,cost,variants:[]}]};
  });
  if(scenario==='partial'){
   if(index===0)account.history[0].cost=null;
   if(index===1)account.history=account.history.filter((_,day)=>day!==1&&day!==32);
  }
 });
 return state;
}
