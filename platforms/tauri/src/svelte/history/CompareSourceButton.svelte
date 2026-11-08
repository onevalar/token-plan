<script lang="ts">
 import type {Snippet} from 'svelte';
 import type {StatisticsSource} from '../../statisticsData';
 let {source,selected,onSelect,class:className,children,label}:{source:StatisticsSource;selected:string|null;onSelect:(key:string|null)=>void;class:string;children:Snippet;label?:string}=$props();
 function moveSource(event:KeyboardEvent & {currentTarget:EventTarget & HTMLButtonElement}){
  if(!['ArrowDown','ArrowUp','ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const buttons=Array.from(event.currentTarget.closest('[data-source-list]')!.querySelectorAll<HTMLButtonElement>('button[data-source]'));
  const index=buttons.indexOf(event.currentTarget),last=buttons.length-1,target=event.key==='Home'?0:event.key==='End'?last:event.key==='ArrowDown'||event.key==='ArrowRight'?(index+1)%buttons.length:(index+last)%buttons.length;
  event.preventDefault();event.stopPropagation();buttons[target].focus();
 }
</script>
<button type="button" class={`tp-compare-source-button ${className}`} data-source={source.key} aria-label={label} aria-pressed={selected===source.key} style={`--source-color:${source.color}`} onclick={()=>onSelect(selected===source.key?null:source.key)} onkeydown={moveSource}>{@render children()}</button>
