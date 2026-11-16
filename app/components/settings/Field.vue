<script setup lang="ts">
import { SETTINGS_CONTEXT, type SettingsContext } from '#shared/settings/config';

// A labelled input of the settings form. `name` is the config value: the field is locked while
// an environment variable sets it, and shows what the validation or the core says about it.
const props = defineProps<{ name: string; label?: string; help?: string; disabled?: boolean }>();

const { t } = useI18n();
const context = inject<SettingsContext>(SETTINGS_CONTEXT, { env: () => false, errors: () => [] });

const env = computed(() => context.env(props.name));
const error = computed(() =>
	context
		.errors(props.name)
		.map((m) => (m.translate ? t(m.error) : m.error))
		.join(' '),
);
</script>

<template>
	<UFormField :label="label" :error="error || undefined">
		<template v-if="env" #hint>
			<SettingsEnv />
		</template>
		<slot :disabled="env || disabled === true" />
		<!-- UFormField shows either the error or the help; the explanation should stay. -->
		<p v-if="help" class="mt-2 text-sm text-muted">{{ help }}</p>
	</UFormField>
</template>
