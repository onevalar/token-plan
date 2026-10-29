import {X} from 'lucide-react';
import type {Metric} from '../../src/desktop';
import {Button} from '../../src/components/arc/button/button';
import {cycleOf,percent,readQuota,type StudyProps} from './data';

export function MetricDetail({metric,onClose,...props}:Pick<StudyProps,'remaining'|'now'|'missing'>&{metric:Metric;onClose:()=>void}) {
 const r=readQuota(metric,props),c=cycleOf(metric,props.now);
 return <section className="hu-metric-detail" role="region" aria-label={`${r.name} 额度详情`} tabIndex={-1} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();}}}>
  <header><h3>{r.name} · 额度详情</h3><Button size="sm" variant="ghost" aria-label="关闭额度详情" onClick={onClose}><X size={16}/></Button></header>
  <dl><div><dt>已用</dt><dd>{r.used===null?'未知':percent(r.used)}</dd></div><div><dt>剩余</dt><dd>{r.used===null?'未知':percent(100-r.used)}</dd></div>
   <div><dt>周期已过</dt><dd>{c.elapsed===null?'未知':percent(Number(c.elapsed.toFixed(2)))}</dd></div><div><dt>重置时刻</dt><dd>{c.exact??c.reset}</dd></div>
  </dl>
  <p>{r.used===null?'没有有效读数，不使用旧值填补，也不写成零。':r.used>100?'数字保留超额值；图形停在边界，不把负剩余伪装成零。':'各项额度独立计算，不把 Session 和 Weekly 相加或平均。'}</p>
  <p>已用达到 80% 才提示接近上限，切换剩余模式不改变警戒判断。此处为固定示例，不连接真实账号。</p>
 </section>;
}
