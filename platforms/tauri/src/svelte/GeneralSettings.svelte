<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {Slider} from '@valar/svelte-ui/slider';
 import {Label} from '@valar/svelte-ui/label';
 import type {DesktopState, Send} from '../desktop';
 import type {Copy} from '../copy';
 import {providerText} from '../providerText';
 import {minimumTransparency, type Density, type DensityPreference, type HomeUsageStylePreference, type PanelSurfacePreference, type PanelAppearancePreference, type PanelStyle} from './preferences.svelte';
 import Group from './Group.svelte';
 import SelectField from './SelectField.svelte';
 import ToggleRow from './ToggleRow.svelte';
 import UsageStylePicker from './settings/UsageStylePicker.svelte';
 import MenuBarSettings from './settings/MenuBarSettings.svelte';
 import SystemSettings from './settings/SystemSettings.svelte';
 import {createChange} from './settings/change.svelte';
 let {state, send, t, busy, language, now, densityPreference, usageStylePreference, panelSurface, panelAppearance, platform, openAccounts}: {state: DesktopState; send: Send; t: Copy; busy: boolean; language: string; now: number; densityPreference: DensityPreference; usageStylePreference: HomeUsageStylePreference; panelSurface: PanelSurfacePreference; panelAppearance: PanelAppearancePreference; platform: string; openAccounts: () => void} = $props();
 const tr = (s: string) => providerText(s, language);
 const changes = createChange(() => send, () => t.failed), disabled = $derived(busy || changes.pending);
 const settings = (value: unknown) => void changes.change({method: 'settings', value});
 const sliderId = $props.id();
</script>

<div class="general-preferences">
 {#if changes.error}<p class="inline-error" role="alert">{changes.error}</p>{/if}
 {#if densityPreference.failed || panelSurface.failed}<p role="alert" class="inline-error">{t.failed}</p>{/if}
 {#if usageStylePreference.error}<p role="alert" class="inline-error">{tr(usageStylePreference.error)}</p>{/if}
 <Group title={tr('Appearance and Language')} description={!panelSurface.material ? undefined : panelSurface.reduced ? tr('Transparency is turned off in system settings, so the panel stays solid.') : panelSurface.surface.style === 'glass' ? tr('Text contrast adjusts automatically so it stays readable over any background.') : undefined}>
  <SelectField label={t.appearance} value={state.settings.appearance} {disabled} options={['system', 'light', 'dark'].map(value => ({value, label: t[value as 'system']}))} onValueChange={appearance => settings({appearance})}/>
  {#if panelAppearance.failed}<div role="alert" class="appearance-notice"><p>{tr('Could not apply the panel appearance. Try again.')}</p><Button size="sm" variant="secondary" disabled={panelAppearance.pending} aria-busy={panelAppearance.pending} onclick={panelAppearance.retry}>{tr('Try Again')}</Button></div>{/if}
  {#if panelSurface.material}
   <SelectField label={tr('Panel Style')} value={panelSurface.surface.style} disabled={panelSurface.reduced} options={[{value: 'glass', label: tr(panelSurface.material)}, {value: 'solid', label: tr('Solid')}]} onValueChange={style => panelSurface.change({style: style as PanelStyle})}/>
   {#if panelSurface.surface.style === 'glass'}<div class="setting-slider"><Label id={`${sliderId}-label`}>{tr('Transparency')}</Label><Slider type="single" value={panelSurface.surface.transparency} disabled={panelSurface.reduced} onValueChange={transparency => panelSurface.change({transparency})} min={minimumTransparency} max={100} step={5} aria-labelledby={`${sliderId}-label`} aria-valuetext={tr(panelSurface.surface.transparency < 45 ? 'Low' : panelSurface.surface.transparency < 75 ? 'Medium' : 'High')}/><div class="slider-labels"><span>{tr('Low')}</span><span>{tr('High')}</span></div></div>{/if}
  {/if}
  <SelectField label={t.language} value={state.settings.language} {disabled} options={[{value: 'system', label: t.system}, {value: 'en', label: 'English'}, {value: 'zh-Hans', label: '简体中文'}, {value: 'zh-Hant', label: '繁體中文'}, {value: 'ja', label: '日本語'}, {value: 'ko', label: '한국어'}]} onValueChange={language => settings({language})}/>
 </Group>
 <Group title={tr('Usage Style')}>
  <SelectField label={tr('Apply Style')} value={usageStylePreference.mode} options={[{value: 'uniform', label: tr('Unified Style')}, {value: 'custom', label: tr('Per Subscription')}]} onValueChange={value => usageStylePreference.changeMode(value as 'uniform' | 'custom')}/>
  {#if usageStylePreference.mode === 'uniform'}<UsageStylePicker {language} remaining={state.settings.showRemaining} value={usageStylePreference.style} onChange={usageStylePreference.changeStyle} {tr}/>{:else}<p class="group-description">{tr("Set a subscription's usage style in its details via Edit Home Display.")}</p>{/if}
 </Group>
 <Group title={tr('Home Page')}>
  <SelectField label={tr('Density')} value={densityPreference.density} options={[{value: 'compact', label: tr('Compact')}, {value: 'comfortable', label: tr('Comfortable')}]} onValueChange={value => densityPreference.changeDensity(value as Density)}/>
  <ToggleRow label={t.showRemaining} checked={state.settings.showRemaining} {disabled} onCheckedChange={showRemaining => settings({showRemaining})}/>
 </Group>
 {#if platform === 'macos'}<MenuBarSettings {state} {t} {tr} {language} {now} {disabled} change={changes.change} {openAccounts}/>{/if}
 <Group title={tr('Data Refresh')}>
  <ToggleRow label={t.autoRefresh} checked={state.settings.autoRefresh} {disabled} onCheckedChange={autoRefresh => settings({autoRefresh})}/>
  {#if state.settings.autoRefresh}<SelectField label={t.interval} value={String(state.settings.refreshMinutes)} {disabled} options={[1, 2, 5, 10, 15, 30, 60].map(n => ({value: String(n), label: `${n} ${tr('Minutes')}`}))} onValueChange={v => settings({refreshMinutes: Number(v)})}/>{/if}
 </Group>
 <div class="system-preferences"><SystemSettings {state} {send} busy={disabled}/></div>
</div>

<style>
 .setting-slider { display: grid; gap: .75rem; padding-block: .75rem; }
 .slider-labels { display: flex; justify-content: space-between; color: var(--muted-foreground); font-size: .75rem; }
</style>
