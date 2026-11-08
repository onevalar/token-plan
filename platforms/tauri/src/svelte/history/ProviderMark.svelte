<script lang="ts">
 import ProviderLogo from '../ProviderLogo.svelte';
 import type {StatisticsSource} from '../../statisticsData';
 let {source}:{source:Pick<StatisticsSource,'key'|'name'|'color'>}=$props();
</script>
<span class="tp-provider-mark"><ProviderLogo family={source.key}/></span>
