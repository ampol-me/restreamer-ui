<script setup lang="ts">
// One input of a publication service form, already resolved against the current settings by <PublicationServiceForm>.
export interface ResolvedServiceField {
	index: number;
	type: 'text' | 'password' | 'select' | 'multiselect' | 'checkbox' | 'url' | 'number' | 'textarea' | 'info';
	label: string;
	help?: string;
	text: string;
	list: string[];
	checked: boolean;
	items: { label: string; value: string; disabled: boolean }[];
	link: { label: string; href: string; disabled: boolean } | null;
	required?: boolean;
	disabled?: boolean;
	placeholder?: string;
	min?: string;
	max?: string;
	step?: string;
	rows?: number;
}

defineProps<{ field: ResolvedServiceField }>();

const emit = defineEmits<{ change: [value: unknown] }>();

// The select component cannot hold an empty value, several services use one for "default".
const EMPTY = '__empty__';
const toItem = (value: string) => (value === '' ? EMPTY : value);
const fromItem = (value: unknown) => (value === EMPTY ? '' : String(value ?? ''));
</script>

<template>
	<div v-if="field.type === 'info'" class="rounded-md bg-elevated px-3 py-2 text-sm">
		<p class="font-medium text-highlighted">{{ field.label }}</p>
		<p class="break-all whitespace-pre-line text-muted">{{ field.help ?? field.text }}</p>
	</div>

	<UCheckbox
		v-else-if="field.type === 'checkbox'"
		:model-value="field.checked"
		:label="field.label"
		:description="field.help"
		:disabled="field.disabled"
		@update:model-value="(v) => emit('change', v === true)"
	/>

	<UFormField v-else :label="field.label" :help="field.help" :required="field.required">
		<div class="flex gap-2">
			<USelect
				v-if="field.type === 'select'"
				:model-value="toItem(field.text)"
				:items="field.items.map((item) => ({ ...item, value: toItem(item.value) }))"
				:disabled="field.disabled"
				class="w-full"
				@update:model-value="(v) => emit('change', fromItem(v))"
			/>
			<USelectMenu
				v-else-if="field.type === 'multiselect'"
				multiple
				value-key="value"
				:model-value="field.list"
				:items="field.items"
				:disabled="field.disabled"
				class="w-full"
				@update:model-value="(v) => emit('change', v)"
			/>
			<UTextarea
				v-else-if="field.type === 'textarea'"
				:model-value="field.text"
				:rows="field.rows"
				:placeholder="field.placeholder"
				:disabled="field.disabled"
				class="w-full"
				@update:model-value="(v) => emit('change', v)"
			/>
			<UInput
				v-else
				:type="field.type === 'password' || field.type === 'number' ? field.type : 'text'"
				:model-value="field.text"
				:placeholder="field.placeholder"
				:disabled="field.disabled"
				:min="field.min"
				:max="field.max"
				:step="field.step"
				autocomplete="off"
				class="w-full"
				@update:model-value="(v) => emit('change', v)"
			/>

			<UButton
				v-if="field.link"
				color="neutral"
				variant="subtle"
				trailing-icon="i-lucide-external-link"
				:label="field.link.label"
				:to="field.link.disabled ? undefined : field.link.href"
				:disabled="field.link.disabled"
				target="_blank"
			/>
		</div>
	</UFormField>
</template>
