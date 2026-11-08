<script lang="ts">
 import type {MetricRowProps} from '../../metric';
 import {textFor} from '../../copy';
 let {metric:m,language}:Pick<MetricRowProps,'metric'|'language'>=$props();
</script>
{#if m.expiries.length>0}<div class="expiries"><span>{textFor(language).expires}</span><ul>{#each m.expiries as date,i (i)}<li>{new Date(date).toLocaleString(language)}</li>{/each}</ul></div>{/if}
