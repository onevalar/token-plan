<script lang="ts">
 import type {Snippet} from 'svelte';
 let {title,description,children}:{title:string;description?:string;children:Snippet}=$props();
</script>

<section class="preference-group"><h2>{title}</h2><div class="preference-surface">{@render children()}</div>{#if description}<p class="group-description">{description}</p>{/if}</section>
