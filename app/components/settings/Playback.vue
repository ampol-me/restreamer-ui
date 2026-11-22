<script setup lang="ts">
import type { SettingsForm } from '#shared/settings/config';

const form = defineModel<SettingsForm>({ required: true });
</script>

<template>
	<div class="space-y-5">
		<h2 class="text-lg font-semibold text-highlighted">{{ $t('Playback') }}</h2>

		<h3 class="font-medium text-highlighted">{{ $t('Security') }}</h3>

		<SettingsToggle v-model="form.storage.cors.allow_all" name="storage.cors.allow_all" env-name="storage.cors.origins" :label="$t('Allow all referrer')" />

		<SettingsField
			v-slot="{ disabled }"
			name="storage.cors.origins"
			label="CORS: Access-Control-Allow-Origin"
			:help="$t('One referrer per line, e.g. http://www.example.com')"
			:disabled="form.storage.cors.allow_all"
		>
			<UTextarea v-model="form.storage.cors.origins" class="w-full" :rows="5" :disabled="disabled" spellcheck="false" />
		</SettingsField>

		<USeparator />

		<h3 class="font-medium text-highlighted">{{ $t('Statistics') }}</h3>

		<SettingsToggle
			v-model="form.sessions.enable"
			name="sessions.enable"
			:label="$t('HLS statistic for the In-memory storage')"
			:help="$t('Allow counting how many viewers the stream has.')"
		/>

		<SettingsField
			v-slot="{ disabled }"
			name="sessions.ip_ignorelist"
			:label="$t('Ignore IP ranges')"
			:help="
				$t(
					'List of IP ranges in CIDR notation, e.g., 127.0.0.1/32, that the statistics will not record—one IP range per line. Leave empty to record all sessions.',
				)
			"
			:disabled="!form.sessions.enable"
		>
			<UTextarea v-model="form.sessions.ip_ignorelist" class="w-full" :rows="5" :disabled="disabled" spellcheck="false" />
		</SettingsField>

		<SettingsField
			v-slot="{ disabled }"
			name="sessions.session_timeout_sec"
			:label="$t('Maximum viewer idle time (Seconds)')"
			:help="$t('Time until an inactive viewer connection is treated as closed.')"
			:disabled="!form.sessions.enable"
		>
			<SettingsNumber v-model="form.sessions.session_timeout_sec" :disabled="disabled" />
		</SettingsField>

		<SettingsToggle
			v-model="form.sessions.persist"
			name="sessions.persist"
			:label="$t('Persist viewer statistics')"
			:help="$t('Stores the viewer statistics to the disk.')"
			:disabled="!form.sessions.enable"
		/>
	</div>
</template>
