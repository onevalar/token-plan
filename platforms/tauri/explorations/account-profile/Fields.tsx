import {Notices, NoteText, UsageContext, updatedTime, type ProfileProps} from './shared';

export function Fields({account}: ProfileProps) {
 const present = account.email || account.plan || account.note || account.fetchedAt;
 return <>
  <Notices account={account}/>
  {present && <section className="ap-fields" aria-label="账号资料">
   <dl>
    {account.email && <div><dt>邮箱</dt><dd>{account.email}</dd></div>}
    {account.plan && <div><dt>套餐</dt><dd>{account.plan}</dd></div>}
    {account.note && <div><dt>备注</dt><dd><NoteText note={account.note}/></dd></div>}
    {account.fetchedAt && <div><dt>上次更新</dt><dd><time dateTime={account.fetchedAt}>{updatedTime(account.fetchedAt)}</time></dd></div>}
   </dl>
  </section>}
  <UsageContext account={account}/>
 </>;
}
