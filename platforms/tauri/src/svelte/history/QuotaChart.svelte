<script lang="ts">
 import SelectField from '../SelectField.svelte';
 import {providerText} from '../../providerText';
 import {quotaSeries} from '../../statisticsModel';
 import type {Account} from '../../desktop';
 let {accounts,range,language,style}:{accounts:Account[];range:string;language:string;style:string}=$props();
 let selected=$state('');
 const series=$derived(quotaSeries(accounts,range)),current=$derived(series.find(s=>s.id===selected)??series[0]);
 const points=$derived(current?.points??[]),percent=$derived(current?.unit==='percent'),valid=$derived(points.filter(p=>p.value!=null));
 const start=$derived(Date.parse(points[0]?.date??'')),end=$derived(Date.parse(points.at(-1)?.date??'')),maximum=$derived(percent?100:Math.max(1,...valid.map(p=>p.value!)));
 const xy=(p:typeof points[number])=>({x:end===start?174:40+(Date.parse(p.date)-start)/(end-start)*268,y:108-(percent?Math.max(0,100-p.value!):p.value!)/maximum*96});
 const tr=(s:string)=>providerText(s,language),exact=(v:number)=>v.toLocaleString(language,{maximumFractionDigits:2});
</script>
{#if !current}<p>{tr('No Recorded Data')}</p>{:else}<SelectField label={tr('Account and Metric')} value={current.id} onValueChange={value=>selected=value} options={series.map(s=>({value:s.id,label:s.name}))}/>
 {#if style==='Quota Line'}<p class="statistics-caption">{percent?tr('Recorded Remaining Quota'):tr('Recorded Value')}</p><svg class="statistics-line" viewBox="0 0 320 120" role="img" aria-label={tr('Quota Changes')}><text x="0" y="14">{exact(maximum)}{percent?'%':''}</text><text x="0" y="110">0</text>
  {#each points as p,i}{#if p.value!=null}{@const pos=xy(p)}{@const prior=points[i-1]}{@const join=prior?.value!=null&&Date.parse(p.date)-Date.parse(prior.date)<=90*60000&&(!percent||p.value>=prior.value)}<g>{#if join}<line x1={xy(prior).x} y1={xy(prior).y} x2={pos.x} y2={pos.y}/>{/if}<circle cx={pos.x} cy={pos.y} r="2.5"/></g>{/if}{/each}
 </svg><div class="statistics-axis"><span>{new Date(start).toLocaleString(language)}</span><span>{new Date(end).toLocaleString(language)}</span></div><p class="statistics-caption">{tr('Actual samples only; gaps and resets are not connected.')}</p>{/if}
 <p class="statistics-caption">{percent?tr('Used'):tr('Recorded Value')}</p><details open={style==='Observation List'}><summary>{tr('Exact Readings')}</summary><div class="statistics-readings">{#each points as p}<div><span>{new Date(p.date).toLocaleString(language)}</span><span>{p.value==null?'—':`${exact(p.value)} ${percent?'%':p.unit??''}`}</span></div>{/each}</div></details>
{/if}
