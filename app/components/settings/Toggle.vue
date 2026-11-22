<script setup lang="ts">
import { SETTINGS_CONTEXT, type SettingsContext } from '#shared/settings/config';

// An on/off config value. `envName` names the config value whose override locks the switch
// when that is not the switch's own (e.g. "allow all" stands for the list of origins).
const props = defineProps<{ name: string; label: string; help?: string; disabled?: boolean; envName?: string }>();

const model = defineModel<boolean>({ required: true });

const { t } = useI18n();
const context = inject<SettingsContext>(SETTINGS_CONTEXT, { env: () => false, errors: () => [] });

const env = computed(() => context.env(props.envName ?? props.name));
const errors = computed(() => context.errors(props.name).map((m) => (m.translate ? t(m.error) : m.error)));
</script>

<template>
	<div>
		<div class="flex items-start gap-3">
			<USwitch v-model="model" :label="label" :description="help" :disabled="env || disabled === true" />
			<SettingsEnv v-if="env" />
		</div>
		<p v-for="(error, index) in errors" :key="index" class="mt-2 text-sm text-error">{{ error }}</p>
	</div>
</template>
