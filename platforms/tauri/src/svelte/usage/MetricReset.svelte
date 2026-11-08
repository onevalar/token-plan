<script lang="ts">
 import {Hourglass} from '@lucide/svelte';
 import {countdown} from '../../usage';
 import {providerText} from '../../providerText';
 import {textFor} from '../../copy';
 import type {MetricRowProps} from '../../metric';
 let {metric:m,now,missing,language}:Omit<MetricRowProps,'remaining'>=$props();
 const reset=$derived(now&&m.hasData?countdown(m.resetsAt,now):null);
</script>
<span class="reset" title={reset&&!m.notStarted?providerText('Resets in %@',language).replace('%@',reset):undefined}>
 {#if reset&&!m.notStarted}<span>{reset}</span><Hourglass size={13} aria-hidden="true"/>{:else}<span class="reset-status">{!m.hasData?missing:m.notStarted?textFor(language).notStarted:'—'}</span>{/if}
</span>
