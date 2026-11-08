<script lang="ts">
 import {Input} from '@valar/svelte-ui/input';
 import {Label} from '@valar/svelte-ui/label';
 import type {HTMLInputAttributes} from 'svelte/elements';
 type Props = Pick<HTMLInputAttributes, 'oninput' | 'id' | 'placeholder' | 'disabled' | 'readonly' | 'maxlength' | 'autocomplete' | 'aria-describedby'> & {label: string; value: string; type?: 'text' | 'password'; error?: string; ref?: HTMLInputElement | null};
 let {label, error, ref = $bindable(null), ...props}: Props = $props();
 const uid = $props.id();
</script>

<div class="account-input-field">
 <Label for={props.id ?? uid}>{label}</Label>
 <Input {...props} id={props.id ?? uid} bind:ref aria-invalid={error ? true : undefined} aria-describedby={error ? `${uid}-error` : props['aria-describedby']}/>
 {#if error}<p id={`${uid}-error`} class="inline-error" role="alert">{error}</p>{/if}
</div>
