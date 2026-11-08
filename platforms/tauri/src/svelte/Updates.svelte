<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {providerText} from '../providerText';
 import type {Copy} from '../copy';
 import type {createUpdater} from './updater.svelte';
 import ToggleRow from './ToggleRow.svelte';
 let {t,updater:u,automatic,onAutomatic}:{t:Copy;updater:ReturnType<typeof createUpdater>;automatic:boolean;onAutomatic:(value:boolean)=>void}=$props();
</script>

<section class="settings-list">
 <ToggleRow label={t.autoUpdates} checked={automatic} onCheckedChange={onAutomatic}/>
 <p role="status">{u.status==='preview'?providerText('Updates are disabled in the design preview.',document.documentElement.lang||navigator.language):u.status==='available'?u.skipped?t.skippedVersion:`${t.updateAvailable} ${u.version}`:u.status==='checking'?t.updateCheck:u.status==='latest'?t.latest:u.status==='checkError'?t.checkError:u.status==='installError'?t.installError:u.status==='installing'?t.installing:''}</p>
 {#if u.status==='installing'}<progress aria-label={t.installing} max={100} value={u.progress??undefined}></progress>{/if}
 <div class="update-actions">
  <Button disabled={u.status==='checking'||u.status==='installing'} aria-busy={u.status==='checking'} onclick={()=>{void u.checkNow();}}>{t.checkUpdates}</Button>
  {#if u.status==='available'||u.status==='installError'}<Button onclick={()=>{void u.install();}}>{t.install}</Button>{/if}
  {#if u.status==='available'&&!u.skipped}<Button variant="secondary" onclick={u.skip}>{t.skipVersion}</Button>{/if}
 </div>
</section>
