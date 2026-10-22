import type {DesktopState} from './desktop';
/** `message` is the full sentence (announced to screen readers); `short` is the one-or-two-word label shown next to the button. */
export type RefreshResult={tone:'success'|'warning'|'error';message:string;short:string};
export function refreshResult(before:DesktopState,after:DesktopState,accountId?:string):RefreshResult {
 const accounts=after.accounts.filter(a=>accountId?a.id===accountId:a.enabled);
 if(!accounts.length)return {tone:'warning',message:'No enabled accounts to refresh.',short:'Nothing to refresh'};
 const failed=accounts.filter(a=>a.error||['unverified','different_account'].includes(a.connection??''));
 if(failed.length){const all=failed.length===accounts.length;return {tone:all?'error':'warning',message:all?'Could not refresh accounts. Check their status.':'Some accounts could not be refreshed. Check their status.',short:all?'Refresh failed':'Some failed'};}
 if(accounts.some(a=>a.warning))return {tone:'warning',message:'Refresh completed with notices. Check account details.',short:'Needs attention'};
 // A manual refresh always fetches, so every target account's fetch time must have advanced. If none did, nothing was actually
 // fetched (a skipped or coalesced request); say so instead of claiming the data is current.
 const fetched=accounts.some(a=>a.fetchedAt&&a.fetchedAt!==before.accounts.find(b=>b.id===a.id)?.fetchedAt);
 return fetched?{tone:'success',message:'Usage updated.',short:'Refreshed'}:{tone:'warning',message:'Nothing new was fetched. Try again in a moment.',short:'Not refreshed'};
}
