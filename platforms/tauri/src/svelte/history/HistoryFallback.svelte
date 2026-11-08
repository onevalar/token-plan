<script lang="ts">
 import MetricRow from '../usage/MetricRow.svelte';
 import type {Account} from '../../desktop';
 import type {Copy} from '../../copy';
 let {accounts,t,language,range}:{accounts:Account[];t:Copy;language:string;range:string}=$props();
 const isHistoryMetric=(id:string)=>/(?:^|\.)(today|yesterday|last30|trend)$/.test(id);
 const fallback=$derived(accounts.length===1?accounts[0].metrics.find(m=>m.id.split('.').at(-1)===({1:'today',yesterday:'yesterday',30:'last30'} as Record<string,string>)[range]):undefined);
 const trend=$derived(accounts.length===1&&range==='30'?accounts[0].metrics.find(m=>m.chart.length>0&&isHistoryMetric(m.id)):undefined);
</script>
{#if fallback?.hasData||trend}<div class="history-fallback">{#if fallback?.hasData}<MetricRow metric={fallback} now={Date.now()} missing={t.noHistory} {language}/>{/if}{#if trend}<MetricRow metric={trend} now={Date.now()} missing={t.noHistory} {language}/>{/if}</div>{:else}<p class="empty-state">{t.noHistory}</p>{/if}
