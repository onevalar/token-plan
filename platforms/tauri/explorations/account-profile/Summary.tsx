import {ExpandableCard} from './arc/expandable-card';
import {Notices, NoteText, UsageContext, updatedTime, type ProfileProps} from './shared';

export function Summary({account}: ProfileProps) {
 return <>
  {(account.email || account.plan || account.fetchedAt) && <section className="ap-summary" aria-label="账号资料摘要">
   {account.email && <p className="ap-summary-email">{account.email}</p>}
   {account.plan && <p className="ap-summary-plan">{account.plan}</p>}
   {account.fetchedAt && <p className="ap-summary-time">上次更新时间 <time dateTime={account.fetchedAt}>{updatedTime(account.fetchedAt)}</time></p>}
  </section>}
  <Notices account={account}/>
  {account.note && <div className="ap-disclosure">
   <ExpandableCard title="账号备注" description="完整备注，按需阅读">
    <NoteText note={account.note}/>
   </ExpandableCard>
  </div>}
  <UsageContext account={account}/>
 </>;
}
