<script lang="ts">
 import {Switch} from '@valar/svelte-ui/switch';
 import * as Field from '@valar/svelte-ui/field';
 let {label,checked,onCheckedChange,disabled=false,description}:{label:string;checked:boolean;onCheckedChange:(value:boolean)=>void;disabled?:boolean;description?:string}=$props();
 const id=$props.id();
</script>

<div class="setting-toggle">
 <Field.Field orientation="horizontal" data-disabled={disabled}>
  <Field.Label for={id}>{label}</Field.Label>
  <Switch {id} bind:checked={() => checked, onCheckedChange} {disabled} aria-describedby={description?`${id}-description`:undefined}/>
 </Field.Field>
 {#if description}<Field.Description id={`${id}-description`}>{description}</Field.Description>{/if}
</div>
