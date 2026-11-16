<script setup lang="ts">
import type { SettingsForm } from '#shared/settings/config';

defineProps<{ paused: boolean }>();

const form = defineModel<SettingsForm>({ required: true });

// The level names are not translated in the legacy UI either.
const levels = [
	{ label: 'Silent', value: 'silent' },
	{ label: 'Error', value: 'error' },
	{ label: 'Warn', value: 'warn' },
	{ label: 'Info', value: 'info' },
	{ label: 'Debug', value: 'debug' },
];
</script>

<template>
	<div class="space-y-5">
		<h2 class="text-lg font-semibold text-highlighted">{{ $t('Logging') }}</h2>

		<h3 class="font-medium text-highlighted">{{ $t('System') }}</h3>

		<SettingsLogViewer :paused="paused" />

		<div class="grid gap-5 md:grid-cols-2">
			<SettingsField v-slot="{ disabled }" name="log.level" :label="$t('Log level')" :help="$t('Level of system protocol.')">
				<USelect v-model="form.log.level" :items="levels" class="w-full" :disabled="disabled" />
			</SettingsField>

			<SettingsField v-slot="{ disabled }" name="log.max_lines" :label="$t('Maximum log lines')" :help="$t('Number of log lines to keep.')">
				<SettingsNumber v-model="form.log.max_lines" :disabled="disabled" />
			</SettingsField>
		</div>

		<h3 class="font-medium text-highlighted">{{ $t('FFmpeg') }}</h3>

		<div class="grid gap-5 md:grid-cols-2">
			<SettingsField v-slot="{ disabled }" name="ffmpeg.log.max_lines" :label="$t('Maximum log lines')" :help="$t('Number of log lines to keep.')">
				<SettingsNumber v-model="form.ffmpeg.log.max_lines" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="ffmpeg.log.max_history"
				:label="$t('Maximum log histroy')"
				:help="$t('Number of logs to keep for each process.')"
			>
				<SettingsNumber v-model="form.ffmpeg.log.max_history" :disabled="disabled" />
			</SettingsField>
		</div>
	</div>
</template>
