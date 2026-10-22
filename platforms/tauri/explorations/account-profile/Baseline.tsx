import {Notices, UsageContext, updatedTime, type ProfileProps} from './shared';

// Literal AccountDetail identity/note/fetchedAt markup, using untouched product CSS.
// Unrelated tabs, configuration, onboarding and history are intentionally outside this comparison.
export function Baseline({account}: ProfileProps) {
 return <>
  {(account.email||account.plan)&&<div className="detail-identity">{account.email&&<span>{account.email}</span>}{account.plan&&<span className="plan-tag">{account.plan}</span>}</div>}
  <Notices account={account}/>
  <UsageContext account={account}/>
  {account.note&&<section className="detail-group"><h2>备注</h2><p>{account.note}</p></section>}
  {account.fetchedAt&&<p className="last-updated">最近更新 {updatedTime(account.fetchedAt)}</p>}
 </>;
}
