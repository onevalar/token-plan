<script lang="ts">
 import type {Snippet} from 'svelte';
 import {SlidersHorizontal} from '@lucide/svelte';
 import {Button} from '@valar/svelte-ui/button';
 import {Switch} from '@valar/svelte-ui/switch';
 import SelectField from '../SelectField.svelte';
 import SortHandle from './SortHandle.svelte';
 import {providerText} from '../../providerText';
 import {defaultStatistics,readStatistics,statisticsKey,moduleTitles,moduleStyles,type ModuleID,type StatisticsPreferences} from '../../statisticsModel';
 let {language,range,children}:{language:string;range:string;children:Snippet<[ModuleID,string]>}=$props();
 let editing=$state(false),error=$state(''),preview=$state<ModuleID|null>(null);
 function load(){try{return readStatistics(localStorage.getItem(statisticsKey));}catch(cause){console.error('Statistics settings could not be read',cause);error='Could not load display settings.';return defaultStatistics();}}
 let preferences=$state(load());
 const tr=(s:string)=>providerText(s,language);
 function change(next:StatisticsPreferences){try{localStorage.setItem(statisticsKey,JSON.stringify(next));preferences=next;error='';}catch(cause){console.error('Statistics settings could not be saved',cause);error='Could not save. Try again.';}}
 function move(id:ModuleID,target:string){const order=[...preferences.order];order.splice(order.indexOf(id),1);order.splice(preferences.order.indexOf(target as ModuleID),0,id);change({...preferences,order});}
</script>
{#if range==='1'||range==='yesterday'}{@render children('overview',preferences.styles.overview)}{@render children('records','')}
{:else}
 <div class="statistics-toolbar"><h2>{tr('Detailed Statistics')}</h2><Button size="sm" variant="secondary" aria-expanded={editing} onclick={()=>editing=!editing}><SlidersHorizontal size={16}/>{tr(editing?'Done':'Display Settings')}</Button></div>
 {#if error}<p role="alert">{tr(error)}</p>{/if}
 {#if editing}<p class="statistics-caption">{tr('Choose a style to preview your records. Detailed modules apply to 7- and 30-day views.')}</p><div class="statistics-settings" data-sort-list="statistics">
  {#each preferences.order as id (id)}<div class="statistics-setting" data-sort-id={id}>
   <div class="statistics-setting-head"><SortHandle {id} label={`${tr('Drag to Reorder')} ${tr(moduleTitles[id])}`} onMove={target=>move(id,target)}/><strong>{tr(moduleTitles[id])}</strong><Switch aria-label={tr(moduleTitles[id])} checked={preferences.enabled[id]} onCheckedChange={enabled=>{change({...preferences,enabled:{...preferences.enabled,[id]:enabled}});preview=enabled?id:preview===id?null:preview;}}/></div>
   {#if preferences.enabled[id]&&moduleStyles[id].length>0}<div class="statistics-style-control"><SelectField label={tr('Style')} value={preferences.styles[id]} options={moduleStyles[id].map(style=>({value:style,label:tr(style)}))} onValueChange={style=>{change({...preferences,styles:{...preferences.styles,[id]:style}});preview=id;}}/><Button size="sm" variant="ghost" aria-expanded={preview===id} onclick={()=>preview=preview===id?null:id}>{tr(preview===id?'Collapse':'Preview')}</Button></div>{#if preview===id}<div class="statistics-setting-preview" aria-label={tr('Style Preview')}>{@render children(id,preferences.styles[id])}</div>{/if}{/if}
  </div>{/each}
 </div>{:else}<div class="statistics-modules">{#each preferences.order.filter(id=>preferences.enabled[id]) as id (id)}<section class="statistics-module" data-statistics-module={id} data-statistics-style={preferences.styles[id]}>{#if id!=='records'}<h2>{tr(moduleTitles[id])}</h2>{/if}{@render children(id,preferences.styles[id])}</section>{/each}{#if !preferences.order.some(id=>preferences.enabled[id])}<p>{tr('Choose modules in Display Settings.')}</p>{/if}</div>{/if}
{/if}
