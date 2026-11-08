<script module lang="ts">
 export type {HomeUsageStyle} from '../../homeUsage';
</script>
<script lang="ts">
 import {TickMeter} from '@valar/svelte-ui/tick-meter';
 import {WaffleChart} from '@valar/svelte-ui/waffle-chart';
 import type {Metric} from '../../desktop';
 import {isQuotaMetric} from '../../metric';
 import {parseStyle,quotaReading,quotaMeter,type HomeUsageStyle} from '../../homeUsage';
 import {textureAt} from '../../texture';
 import type {ReadingProps,SourceShare} from './types';
 import MetricRow from './MetricRow.svelte';
 import MetricReset from './MetricReset.svelte';
 import MetricExpiries from './MetricExpiries.svelte';
 import QuotaGauge from './QuotaGauge.svelte';
 import HomeQuotaStyles from './HomeQuotaStyles.svelte';
 import HomeExtraStyles from './HomeExtraStyles.svelte';
 import HomeQuotaDesigns from './HomeQuotaDesigns.svelte';
 import '../../home-metrics.css';
 let {metrics,style,sources=[],...reading}:{metrics:Metric[];style:HomeUsageStyle;sources?:SourceShare[]}&ReadingProps=$props();
 const spec=$derived(parseStyle(style)??parseStyle('bars')!);
</script>
{#if spec.design}
 {#key style}<HomeQuotaDesigns {metrics} design={spec.design} {style} {...reading}/>{/key}
{:else if spec.root==='cells'||spec.root==='gauges'||spec.root==='ticks'}
 <div class="home-metrics" data-style={spec.root} data-quota-count={spec.root==='cells'?metrics.filter(isQuotaMetric).length:undefined}>
  {#each metrics as metric (metric.id)}
   {#if isQuotaMetric(metric)}
    {@const r=quotaReading({metric,...reading})}
    <div class="home-quota" data-metric={metric.id} data-tone={r.tone}>
     {#if spec.root!=='gauges'}<div class="quota-title">{r.name}</div>{/if}
     <div class="quota-body">
      {#if r.value===null}<div class="quota-missing">{#if spec.root==='gauges'}<span>{r.name}</span>{/if}<span aria-hidden="true">—</span><span>{reading.missing}</span></div>
      {:else if spec.root==='ticks'}<div class="quota-ticks" style="--primary:var(--quota-color);--destructive:var(--danger);--border:var(--border-strong)"><TickMeter value={r.value} label={r.label} valueText={r.valueText} tone={r.tone==='critical'?'danger':'accent'} {...quotaMeter(r)}/></div>
      {:else if spec.root==='gauges'}<QuotaGauge reading={r}/>
      {:else}<div class="quota-cells">{#if r.value>=0&&r.value<=100}<div class="quota-grid"><WaffleChart label={`${r.label} · ${r.description}`} data={[{key:'reading',value:r.value,color:'var(--quota-color)'},{key:'rest',value:100-r.value,color:'var(--border-strong)'}]}/></div>{/if}<div class="quota-number"><strong>{r.valueText}</strong></div></div>{/if}
     </div>
     {#if metric.hasData}<MetricReset {metric} {...reading}/>{:else}<span></span>{/if}
     <div class="quota-expiries"><MetricExpiries {metric} language={reading.language}/></div>
    </div>
   {:else}<div class="home-metric-row"><MetricRow {metric} {...reading}/></div>{/if}
  {/each}
 </div>
{:else if ['rings','concentric','ruler','numbers','segments'].includes(spec.root)}<HomeQuotaStyles {metrics} {spec} {...reading}/>
{:else if spec.family==='bars'&&!spec.forecast}
 {#each metrics as metric (metric.id)}<MetricRow {metric} {...reading}/>{/each}
{:else if spec.family==='texturebar'&&spec.layout==='row'}
 {#each metrics as metric,i (metric.id)}<MetricRow {metric} texture={textureAt(spec.texture,i)} tint={spec.tint} {...reading}/>{/each}
{:else}<HomeExtraStyles {metrics} {spec} {sources} {...reading}/>{/if}
