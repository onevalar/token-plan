<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {providerText} from '../../providerText';
 let {range,onRange,language}:{range:string;onRange:(range:string)=>void;language:string}=$props();
</script>
<nav class="segments preview-segments history-ranges" aria-label={providerText('Time Range',language)}>
 {#each [['1','Today'],['yesterday','Yesterday'],['7','Last 7 Days'],['30','Last 30 Days']] as [value,label]}
  <Button size="sm" variant={range===value?'secondary':'ghost'} aria-pressed={range===value} onclick={()=>onRange(value)}>{providerText(label,language)}</Button>
 {/each}
</nav>
