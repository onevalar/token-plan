import type {DesktopState} from './desktop';
export type RefreshResult={tone:'success'|'warning'|'error';message:string};
export function refreshResult(before:DesktopState,after:DesktopState,accountId?:string):RefreshResult {
 const accounts=after.accounts.filter(a=>accountId?a.id===accountId:a.enabled);
 if(!accounts.length)return {tone:'warning',message:'No enabled accounts to refresh.'};
 const failed=accounts.filter(a=>a.error||['unverified','different_account'].includes(a.connection??''));
 if(failed.length)return {tone:failed.length===accounts.length?'error':'warning',message:failed.length===accounts.length?'Could not refresh accounts. Check their status.':'Some accounts could not be refreshed. Check their status.'};
 if(accounts.some(a=>a.warning))return {tone:'warning',message:'Refresh completed with notices. Check account details.'};
 const changed=accounts.some(a=>a.fetchedAt&&a.fetchedAt!==before.accounts.find(b=>b.id===a.id)?.fetchedAt);
 return {tone:'success',message:changed?'Usage updated.':'Checked. No new usage data.'};
}
