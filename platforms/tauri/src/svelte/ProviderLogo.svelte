<script lang="ts">
 import {providerTheme} from '../providerTheme';
 import {cssText} from './usage/types';
 let {family}:{family:string}=$props();
</script>

<span aria-hidden="true" class="provider-logo" data-provider={family} style={`${cssText(providerTheme(family) as Record<string,string>)};mask-image:url("/providers/${family}.svg");-webkit-mask-image:url("/providers/${family}.svg")`}></span>
