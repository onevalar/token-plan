import type {Metric} from '../../src/desktop';
import {MetricReset} from '../../src/Metrics';
import {countdown} from '../../src/usage';
import {now} from '../usage-candidates/data';

export function Reset({metric,missing}:{metric:Metric;missing:string}) {
 const timed=metric.hasData&&!metric.notStarted&&countdown(metric.resetsAt,now)!==null;
 return <span className="next-reset">{timed&&<span>距重置</span>}<MetricReset metric={metric} now={now} missing={missing} language="zh-Hans"/></span>;
}
