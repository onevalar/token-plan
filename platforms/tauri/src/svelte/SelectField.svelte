<script lang="ts">
 import * as Select from '@valar/svelte-ui/select';
 import * as Field from '@valar/svelte-ui/field';
 let {label,value,options,onValueChange,disabled=false,description,placeholder='',id,class:className=''}:{
  label:string;value:string;options:{value:string;label:string;disabled?:boolean}[];
  onValueChange:(value:string)=>void;disabled?:boolean;description?:string;placeholder?:string;id?:string;class?:string;
 }=$props();
 const generated=$props.id();
 const controlId=$derived(id??generated);
</script>

<div class="setting-select {className}">
 <div>
  <Field.Label for={controlId}>{label}</Field.Label>
  <Select.Root type="single" bind:value={() => value, next => onValueChange(next ?? '')} items={options} {disabled}>
   <Select.Trigger id={controlId} aria-describedby={description?`${controlId}-description`:undefined} class="w-full">
    <Select.Value {placeholder}/>
   </Select.Trigger>
   <Select.Content collisionPadding={12}>
    {#each options as option (option.value)}<Select.Item value={option.value} label={option.label} disabled={option.disabled}>{option.label}</Select.Item>{/each}
   </Select.Content>
  </Select.Root>
 </div>
 {#if description}<Field.Description id={`${controlId}-description`}>{description}</Field.Description>{/if}
</div>
