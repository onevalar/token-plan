import type {Account} from '../../src/desktop';
import {MetricRow, isQuotaMetric} from '../../src/Metrics';
import {now} from './data';

export type ProfileProps = {account: Account};
export const updatedTime = (value: string) => new Date(value).toLocaleTimeString('zh-Hans', {hour:'2-digit', minute:'2-digit'});

export function Notices({account}: ProfileProps) {
 return <>
  {account.error && <p role="status" className="inline-error">{account.error}</p>}
  {!account.error && account.warning && <p role="status" className="group-description">{account.warning}</p>}
 </>;
}

export function UsageContext({account}: ProfileProps) {
 const quota = account.metrics.filter(isQuotaMetric), balance = account.metrics.filter(metric => !isQuotaMetric(metric));
 const rows = (metrics: Account['metrics']) => metrics.map(metric => <MetricRow key={metric.id} metric={metric} now={now} missing="暂无数据" language="zh-Hans"/>);
 return <>
  {quota.length > 0 && <section className="detail-group"><h2>当前额度</h2>{rows(quota)}</section>}
  {balance.length > 0 && <section className="detail-group"><h2>余额与权益</h2>{rows(balance)}</section>}
 </>;
}

export function NoteText({note}: {note:string}) {
 // Cap only genuinely long sample text; the independent scroll region is keyboard accessible.
 const long = note.length > 500 || note.split('\n').length > 8;
 return long
  ? <div className="ap-note-scroll" tabIndex={0} role="region" aria-label="完整备注，可滚动"><p className="ap-note">{note}</p></div>
  : <p className="ap-note">{note}</p>;
}
