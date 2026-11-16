<script setup lang="ts">
import type { SettingsForm } from '#shared/settings/config';

const form = defineModel<SettingsForm>({ required: true });
</script>

<template>
	<div class="space-y-5">
		<h2 class="text-lg font-semibold text-highlighted">{{ $t('Network') }}</h2>

		<h3 class="font-medium text-highlighted">{{ $t('Address') }}</h3>

		<SettingsField
			v-slot="{ disabled }"
			name="host.name"
			:label="$t('Public domain/s')"
			:help="$t('The public reachable domain name of the host this Restreamer is running on. Separate multiple domain names by a comma.')"
		>
			<UInput v-model="form.host.name" class="w-full" :disabled="disabled" />
		</SettingsField>

		<div class="grid gap-5 md:grid-cols-2">
			<SettingsField v-slot="{ disabled }" name="address" :label="$t('HTTP port')" :help="$t('Address to listen on for HTTP requests.')">
				<SettingsNumber v-model="form.address" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="tls.address"
				:label="$t('HTTPS port')"
				:help="$t('Address to listen on for HTTPS requests.')"
				:disabled="!form.tls.auto"
			>
				<SettingsNumber v-model="form.tls.address" :disabled="disabled" />
			</SettingsField>
		</div>

		<USeparator />

		<h3 class="font-medium text-highlighted">{{ $t('HTTPS (SSL/TLS)') }}</h3>

		<SettingsToggle
			v-model="form.tls.auto"
			name="tls.auto"
			:label="$t(`Let's Encrypt certification`)"
			:help="$t(`Let's Encrypt requires one or more public domain names and an accessible port 80/TCP.`)"
			:disabled="form.host.name.length === 0"
		/>

		<SettingsField
			v-slot="{ disabled }"
			name="tls.email"
			:label="$t('Email')"
			:help="
				$t(`Please enter your email address to signify agreement with the Let's Encrypt CA's terms of service and to be notified in case of issues.`)
			"
			:disabled="!form.tls.auto"
		>
			<UInput v-model="form.tls.email" type="email" class="w-full" :disabled="disabled" />
		</SettingsField>

		<USeparator />

		<h3 class="font-medium text-highlighted">{{ $t('Bandwidth control') }}</h3>

		<SettingsField
			v-slot="{ disabled }"
			name="sessions.max_sessions"
			:label="$t('Maximum viewers')"
			:help="
				$t(
					'Sets a viewer limit for HLS sessions. If the limit is exceeded, HLS viewers receive the HTTP status code 509 (Bandwidth Limit Exceeded). 0 is unlimited.',
				)
			"
		>
			<SettingsNumber v-model="form.sessions.max_sessions" :disabled="disabled" />
		</SettingsField>

		<SettingsField
			v-slot="{ disabled }"
			name="sessions.max_bitrate_mbit"
			:label="$t('Maximum bandwidth Mbit/s')"
			:help="
				$t(
					'Sets a bandwidth limit in Mbit per second for outgoing HLS data transfer. All services, such as RTMP and outgoing processes, are included in the calculation. If the bandwidth is exceeded, HLS viewers receive the HTTP status code 509 (Bandwidth Limit Exceeded). 0 is unlimited.',
				)
			"
		>
			<SettingsNumber v-model="form.sessions.max_bitrate_mbit" :disabled="disabled" />
		</SettingsField>
	</div>
</template>
