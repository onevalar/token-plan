<script lang="ts">
 import {untrack} from 'svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {Input} from '@valar/svelte-ui/input';
 import {Label} from '@valar/svelte-ui/label';
 import {RulerSlider} from '@valar/svelte-ui/ruler-slider';
 import SectionTitle from './SectionTitle.svelte';
 import SourceList from './SourceList.svelte';
 import {statisticsCopy,type StatisticsChartProps} from '../../statisticsData';
 import {createCostReference,validCostReference,maximumCostReference} from './costReference.svelte';
 import '../../preview/statistics-budget.css';
 let {view,variant,language,scope,range,selected,onSelect}:StatisticsChartProps&{scope:string;range:string}=$props();
 const reference=untrack(()=>createCostReference(scope,range));
 const budget=$derived(reference.budget),copy=$derived(statisticsCopy(language));
 let draft=$state(String(reference.budget)),invalid=$state(false);
 const scaleFor=(value:number)=>Math.min(maximumCostReference,Math.max(1000,Math.ceil(value/500)*500+500));
 let ceiling=$state(scaleFor(reference.budget));const inputID=$props.id();
 $effect(()=>{draft=String(budget);invalid=false;});
 const cost=$derived(view.total.cost),incomplete=$derived(!view.costComplete||view.partial),ratio=$derived(budget>0&&cost!==null?cost/budget:null);
 const over=$derived(cost!==null&&budget>0&&cost>budget);
 const difference=$derived(budget===0?copy.tr('Reference Not Active'):cost===null?copy.tr('Cost is unknown; the difference is unknown.'):over?copy.tr(incomplete?'At least %@ above the reference.':'%@ above the reference.',copy.money(cost-budget)):incomplete?copy.tr('Incomplete records. The remaining difference is unknown.'):copy.tr('%@ below the reference.',copy.money(budget-cost)));
 const targetCeiling=$derived(Math.max(200,budget*1.2,(cost??0)*1.1));
 const meter=$derived(ratio===null?{}:{role:'meter' as const,'aria-label':copy.tr('Known Cost / Reference'),'aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.min(100,ratio*100),'aria-valuetext':`${(ratio*100).toLocaleString(language,{maximumFractionDigits:1})}% · ${difference}`});
 const at=(radius:number,angle:number)=>({x:160+radius*Math.sin(angle*Math.PI/180),y:145-radius*Math.cos(angle*Math.PI/180)});
 function apply(value:number){ceiling=scaleFor(value);reference.change(value);reference.save(value);}
</script>
{#snippet needle()}
 <div class="tp-needle-dial"><svg viewBox="0 0 320 245" aria-hidden="true"><circle cx="160" cy="145" r="104" class="tp-dial-face"/>
  {#each Array.from({length:61},(_,i)=>i) as index}{@const angle=-120+index*4}{@const a=at(index%5===0?105:111,angle)}{@const b=at(121,angle)}<line x1={a.x} y1={a.y} x2={b.x} y2={b.y} class={ratio!==null&&index/60<=Math.min(1,ratio)?'tp-dial-tick is-filled':'tp-dial-tick'}/>{/each}
  {#each [0,25,50,75,100] as value}{@const point=at(139,-120+value*2.4)}<text x={point.x} y={point.y+4} text-anchor="middle">{value}</text>{/each}
  {#if ratio!==null}<g class="tp-dial-needle" style={`transform:rotate(${-120+Math.min(1,ratio)*240}deg)`}><path d="M157 151 L160 52 L163 151 Z"/><line x1="160" y1="145" x2="160" y2="165"/></g>{/if}<circle cx="160" cy="145" r="8" class="tp-dial-pin"/>
 </svg><div class="tp-dial-value"><strong>{ratio===null?'—':`${(ratio*100).toLocaleString(language,{maximumFractionDigits:1})}%`}</strong><span>{copy.tr(ratio===null?'Reference Not Active':'Known Cost / Reference')}</span></div></div>
{/snippet}
<div class={`tp-budget tp-budget-${variant}`} data-over={over} data-incomplete={incomplete} style={`--budget-ink:${over?'var(--warning)':'var(--accent)'}`}>
 <p class="tp-budget-context">{copy.tr('Personal reference for the selected period, not a subscription quota.')}</p>
 {#if variant===2}<div class="tp-target"><div class="tp-target-heading"><span>{copy.tr('Known Cost')}</span><strong data-testid="hero-total" data-value={cost??'unknown'}>{copy.format(cost,'cost')}</strong></div><div class="tp-target-track" aria-hidden="true">{#if cost!==null}<i style={`width:${cost/targetCeiling*100}%`}></i>{/if}{#if budget>0}<span class="tp-target-marker" style={`left:${budget/targetCeiling*100}%`}><span>{copy.tr('Reference')}</span></span>{/if}</div><div class="tp-target-axis"><span>$0</span><span>{copy.format(targetCeiling,'cost')}</span></div></div>
  <div class="tp-budget-ruler"><RulerSlider label={copy.tr('Drag to Adjust Reference')} value={budget} onValueChange={reference.change} onValueCommit={reference.save} min={0} max={ceiling} step={1} majorEvery={Math.max(50,Math.ceil(ceiling/100))} spacing={2} unit="USD" format={value=>value.toLocaleString(language)} animateReadout={false}/></div>
 {:else}<div class="tp-budget-total"><span class="tp-caption">{copy.tr('Known Cost')}{incomplete?` · ${copy.tr('Recorded Portion Only')}`:''}</span><strong data-testid="hero-total" data-value={cost??'unknown'}>{copy.format(cost,'cost')}<small>USD</small></strong></div><div {...meter}>
   {#if variant===0}{@render needle()}{:else}<div class="tp-battery" data-unknown={ratio===null} data-partial={incomplete} aria-hidden="true">{#each Array.from({length:40},(_,i)=>i) as index}<i><span style={`transform:scaleX(${ratio===null?0:Math.max(0,Math.min(1,ratio*40-index))})`}></span></i>{/each}</div><p class="tp-battery-caption">{ratio===null?copy.tr('Reference Not Active'):copy.tr('%@% of the Personal Reference',(ratio*100).toLocaleString(language,{maximumFractionDigits:1}))}</p><p class="tp-chart-note">{copy.tr('40 cells show the recorded ratio. Empty cells are not a provider balance.')}</p>{/if}
  </div>{/if}
 <div class="tp-budget-difference" data-testid="budget-difference"><strong>{difference}</strong><span>{budget>0?`${copy.tr('Reference')} ${copy.money(budget)}`:copy.tr('Set a reference to compare costs.')}</span></div>
 <form class="tp-budget-input" novalidate onsubmit={event=>{event.preventDefault();const value=Number(draft);if(!draft.trim()||!validCostReference(value)){invalid=true;return;}invalid=false;apply(value);}}>
  <div class="tp-reference-field"><Label for={inputID}>{copy.tr('Personal Reference (USD)')}</Label><Input id={inputID} type="number" inputmode="numeric" min={0} max={maximumCostReference} step={1} value={draft} aria-invalid={invalid} aria-describedby={invalid?`${inputID}-error`:undefined} oninput={event=>{draft=event.currentTarget.value;invalid=false;}}/>{#if invalid}<p id={`${inputID}-error`} class="inline-error" role="alert">{copy.tr('Enter a whole amount between 0 and %@.',maximumCostReference.toLocaleString(language))}</p>{/if}</div>
  <Button type="submit" variant="secondary">{copy.tr(reference.saved&&draft===String(budget)?'Saved':'Apply')}</Button>
 </form>
 {#if reference.error}<p class="inline-error" role="alert">{copy.tr(reference.error)}</p>{/if}
 <div class="tp-budget-presets" aria-label={copy.tr('Reference Presets')}>{#each [0,100,200,500] as value}<Button type="button" size="sm" variant="ghost" aria-pressed={budget===value} onclick={()=>apply(value)}>{value===0?copy.tr('Off'):copy.money(value)}</Button>{/each}</div>
 <p class="tp-chart-note">{copy.tr('Saved on this device for this account selection and time range. Zero disables comparison. No forecast is calculated.')}</p><SectionTitle>{copy.tr('Cost Sources')}</SectionTitle><SourceList {view} measure="cost" {language} {selected} {onSelect} bars={false}/>
</div>
<style>.tp-reference-field{display:grid;gap:var(--space-2,8px);min-width:0}</style>
