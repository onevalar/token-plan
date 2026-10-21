import type {Account} from './desktop';
// Connection attribution and fetching usage are independent. In particular, network,
// permission and rate-limit failures must never send users into a login loop.
export function connectionAction(account:Account):'retry'|'inspect'|'login'|'none' {
 const error=account.error.toLowerCase();
 if(/rate.limit|too many|throttl|temporarily limit|retry.after|timed out|timeout|network|proxy|dns|connection|tls|ssl/.test(error)&&!error.startsWith('another account is currently connected'))return 'retry';
 if(/permission|could not be read|invalid.*data|invalid.*format|keychain|directory/.test(error)||['unverified','different_account'].includes(account.connection??'')||error.startsWith('account saved.'))return 'inspect';
 if(/session.*expired|unauthorized|not logged in|not signed in|sign in with|log in again|login required|authenticate/.test(error))return 'login';
 return 'none';
}
export function connectionSummary(a:Account):string {
 const action=connectionAction(a);
 if(action==='retry')return 'Usage temporarily unavailable; retry later.';
 if(action==='inspect')return a.connection==='different_account'?'Another account is connected.':'Login source needs checking.';
 if(action==='login')return 'Login authorization is required.';
 if(a.error)return 'Usage could not be read; see the details below.';
 if(a.fetchedAt)return 'Usage loaded.';
 if(a.connection==='available')return 'Account identified. Enable it and refresh to load usage.';
 return 'No login or usage confirmed.';
}
