<script lang="ts">
 import {Button} from '@valar/svelte-ui/button';
 import {ChevronDown} from '@lucide/svelte';
 import {categoryOf, styleCategories, variantLabel, sameLook, styleOptions, type HomeUsageStyle} from '../../homeUsage';
 import {metricSchema} from '../../desktop';
 import SelectField from '../SelectField.svelte';
 import HomeMetrics from '../usage/HomeMetrics.svelte';
 import StyleGlyph from './StyleGlyph.svelte';
 let {value, onChange, tr, language, remaining = false, disabled = false}: {value: HomeUsageStyle; onChange: (style: HomeUsageStyle) => void; tr: (s: string) => string; language: string; remaining?: boolean; disabled?: boolean} = $props();
 let open = $state(false);
 const now = Date.now();
 const current = $derived(categoryOf(value));
 const groups = $derived(styleOptions(value).filter(g => ['Forecast', 'Shape', 'Cell Count', 'Bar Layout', 'Texture Type', 'Texture Color'].includes(g.name) && current.id !== 'vessel'));
 const metrics = $derived([['5h', 46, 18000], ['1w', 92, 604800]].map(([label, used, period]) => metricSchema.parse({id: `preview-${label}`, label, placement: 'home', pinned: false, pinnable: true, hasData: true, unit: 'percent', percent: remaining ? 100 - Number(used) : used, amount: null, resetsAt: new Date(now + Number(period) * .4 * 1000).toISOString(), periodSeconds: period, values: []})));
</script>

<div class="usage-style-picker">
 <Button variant="ghost" type="button" class="usage-style-toggle" {disabled} aria-expanded={open} onclick={() => { open = !open; }}>
  <span>{tr('Usage Style')}</span><span class="usage-style-trigger"><span class="usage-style-current">{tr(variantLabel(value))}</span><ChevronDown size={15} aria-hidden="true" data-open={open}/></span>
 </Button>
 {#if open}
  <div class="usage-style-options" role="group" aria-label={tr('Usage Style')}>
   {#each styleCategories as category (category.id)}
    <Button {disabled} type="button" variant="secondary" class="usage-style-option" aria-pressed={current.id === category.id} onclick={() => { if (current.id !== category.id) onChange(category.styles[0]); }}>
     <span class="usage-style-card-content"><StyleGlyph style={category.id}/><span>{tr(category.label)}</span></span>
    </Button>
   {/each}
  </div>
  {#if current.styles.length > 1}<SelectField label={tr('Variant')} {disabled} value={current.styles.find(id => sameLook(id, value)) ?? current.styles.find(id => id.split(':')[0] === value.split(':')[0]) ?? current.styles[0]} options={current.styles.map(id => ({value: id, label: tr(variantLabel(id))}))} onValueChange={onChange}/>{/if}
  {#each groups as group (group.name)}<SelectField label={tr(group.name)} {disabled} value={group.choices.find(c => sameLook(c.id, value))?.id ?? group.choices[0].id} options={group.choices.map(c => ({value: c.id, label: tr(c.label)}))} onValueChange={onChange}/>{/each}
 {/if}
 <section class="usage-live-preview" aria-label={tr('Style Preview')}><div class="usage-preview-label">{tr('Style Preview')} · {tr('Sample Data')}</div><HomeMetrics {metrics} style={value} {language} {remaining} {now} missing="—" sources={[{name: 'Model A', share: .7}, {name: 'Model B', share: .3}]}/></section>
</div>
