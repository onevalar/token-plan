import {MetricRow} from '../../../src/Metrics';
import {now} from '../data';
import type {VariantProps} from '../readout';
export function Classic({metrics,remaining,missing}:VariantProps) {
 return <>{metrics.map(metric=><MetricRow key={metric.id} metric={metric} remaining={remaining} missing={missing} now={now} language="zh-Hans"/>)}</>;
}
