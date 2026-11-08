<script lang="ts">
 import type {Snippet} from 'svelte';
 let {children,aside}:{children:Snippet;aside?:Snippet}=$props();
</script>
<div class="tp-section-title"><h3>{@render children()}</h3>{#if aside}<span>{@render aside()}</span>{/if}</div>
