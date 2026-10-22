import {HistorySummary} from '../../src/preview/HistoryPage';
import {textFor} from '../../src/copy';
import type {Account} from '../../src/desktop';
import type {SummaryProps} from './data';

// This is the maintained product component, not a copy or a redesigned approximation.
export function Classic({accounts,range,onRange}:{accounts:Account[]}&Pick<SummaryProps,'range'|'onRange'>) {
 return <HistorySummary accounts={accounts} t={textFor('zh-Hans')} language="zh-Hans" range={range} onRange={onRange}/>;
}
