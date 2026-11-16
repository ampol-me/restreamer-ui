<script setup lang="ts">
import type { SettingField, SettingsContext } from '#shared/coders/fields';

// Renders the settings form of a coder or filter from its field description
// (shared/coders/fields, shared/filters/fields).
const props = withDefaults(
	defineProps<{
		fields: SettingField[];
		modelValue: Record<string, unknown>;
		ctx?: SettingsContext;
	}>(),
	{ ctx: () => ({ stream: null, skills: {} }) },
);

const emit = defineEmits<{ 'update:modelValue': [settings: Record<string, unknown>] }>();

const { t } = useI18n();

// Select item that switches an `allowCustom` field to its text input. Never stored.
const CUSTOM = '__custom__';

const widths: Record<NonNullable<SettingField['cols']>, string> = {
	4: 'col-span-12 md:col-span-4',
	6: 'col-span-12 md:col-span-6',
	8: 'col-span-12 md:col-span-8',
	12: 'col-span-12',
};

// Fields the user switched to "Custom ..." (or back) by hand. Without an entry a field is in
// custom mode exactly when its value is not one of the options.
const customMode = ref<Record<string, boolean>>({});

watch(
	() => props.fields,
	() => {
		customMode.value = {};
	},
);

const visible = computed(() =>
	props.fields.map((field, index) => ({ field, index })).filter(({ field }) => !field.showIf || field.showIf(props.modelValue, props.ctx)),
);

function text(field: SettingField): string {
	const value = props.modelValue[field.key];
	return value === undefined || value === null ? '' : String(value);
}

function isCustom(field: SettingField): boolean {
	if (!field.allowCustom) return false;
	return customMode.value[field.key] ?? !(field.options ?? []).some((o) => o.value === text(field));
}

function items(field: SettingField) {
	const options = (field.options ?? []).map((o) => ({ value: o.value, label: t(o.label) }));
	return field.allowCustom ? [...options, { value: CUSTOM, label: t('Custom ...') }] : options;
}

function disabled(field: SettingField): boolean {
	return field.disabledIf ? field.disabledIf(props.modelValue, props.ctx) : false;
}

function set(field: SettingField, value: unknown) {
	const next = { ...props.modelValue, [field.key]: value };
	emit('update:modelValue', field.derive ? { ...next, ...field.derive(value, next) } : next);
}

function select(field: SettingField, value: unknown) {
	if (value === CUSTOM) {
		// Like legacy, the custom input starts out with the value that was selected.
		customMode.value = { ...customMode.value, [field.key]: true };
		return;
	}
	if (field.allowCustom) customMode.value = { ...customMode.value, [field.key]: false };
	set(field, String(value));
}
</script>

<template>
	<div v-if="visible.length" class="grid grid-cols-12 gap-4">
		<template v-for="{ field, index } in visible" :key="index">
			<UAlert
				v-if="field.type === 'note'"
				class="col-span-12"
				color="warning"
				variant="subtle"
				icon="i-lucide-triangle-alert"
				:title="t(field.label)"
				:description="field.help ? t(field.help) : undefined"
			/>

			<div v-else :class="widths[field.cols ?? 12]">
				<UCheckbox
					v-if="field.type === 'checkbox'"
					:model-value="modelValue[field.key] === true"
					:label="t(field.label)"
					:description="field.help ? t(field.help) : undefined"
					:disabled="disabled(field)"
					@update:model-value="(v) => set(field, v === true)"
				/>

				<div v-else-if="field.type === 'select'" class="grid gap-4" :class="isCustom(field) ? 'grid-cols-2' : 'grid-cols-1'">
					<UFormField :label="t(field.label)" :help="field.help && !isCustom(field) ? t(field.help) : undefined">
						<USelect
							:model-value="isCustom(field) ? CUSTOM : text(field)"
							:items="items(field)"
							:disabled="disabled(field)"
							class="w-full"
							@update:model-value="(v) => select(field, v)"
						/>
					</UFormField>
					<UFormField v-if="isCustom(field)" :label="t(field.customLabel || field.label)" :help="field.help ? t(field.help) : undefined">
						<UInput :model-value="text(field)" :disabled="disabled(field)" class="w-full" @update:model-value="(v) => set(field, String(v))" />
					</UFormField>
				</div>

				<UFormField v-else :label="t(field.label)" :help="field.help ? t(field.help) : undefined">
					<UTextarea
						v-if="field.type === 'textarea'"
						:model-value="text(field)"
						:disabled="disabled(field)"
						:rows="3"
						autoresize
						class="w-full"
						@update:model-value="(v) => set(field, String(v))"
					/>
					<!-- Numbers stay strings in the settings, as the coders expect them. -->
					<UInput
						v-else
						:model-value="text(field)"
						:type="field.type === 'number' ? 'number' : 'text'"
						:min="field.min"
						:max="field.max"
						:disabled="disabled(field)"
						class="w-full"
						@update:model-value="(v) => set(field, String(v))"
					/>
				</UFormField>
			</div>
		</template>
	</div>
</template>
