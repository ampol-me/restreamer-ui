<script setup lang="ts">
import type { SelectOption } from '#shared/sources/options';

// A select that can switch to a free text input (legacy misc/SelectCustom.js).
const props = withDefaults(
	defineProps<{
		modelValue: string | number;
		options: SelectOption[];
		label: string;
		customLabel?: string;
		help?: string;
		allowAuto?: boolean;
		allowCustom?: boolean;
	}>(),
	{ customLabel: undefined, help: undefined, allowAuto: false, allowCustom: false },
);

const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const { t } = useI18n();

const CUSTOM = 'custom';

const items = computed(() => [
	...(props.allowAuto ? [{ value: 'auto', label: 'auto' }] : []),
	...props.options,
	...(props.allowCustom ? [{ value: CUSTOM, label: t('Custom ...') }] : []),
]);

const text = computed(() => String(props.modelValue ?? ''));

// As in legacy, whether the value is a custom one is decided once: a custom text that happens
// to equal an option must not flip the field back to the select while typing.
const custom = ref(props.allowCustom && !items.value.some((o) => o.value !== CUSTOM && o.value === props.modelValue));

function select(value: string) {
	if (props.allowCustom && value === CUSTOM) {
		// The custom input starts out with the value that was selected.
		custom.value = true;
		emit('update:modelValue', text.value);
		return;
	}

	custom.value = false;
	emit('update:modelValue', value);
}
</script>

<template>
	<div class="grid gap-4" :class="custom ? 'grid-cols-2' : 'grid-cols-1'">
		<UFormField :label="label" :help="custom ? undefined : help">
			<USelect :model-value="custom ? CUSTOM : text" :items="items" class="w-full" @update:model-value="(v) => select(String(v))" />
		</UFormField>
		<UFormField v-if="custom" :label="customLabel || label" :help="help">
			<UInput :model-value="text" class="w-full" @update:model-value="(v) => emit('update:modelValue', String(v))" />
		</UFormField>
	</div>
</template>
