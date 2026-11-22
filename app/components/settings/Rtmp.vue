<script setup lang="ts">
import type { SettingsForm } from '#shared/settings/config';

defineEmits<{ tab: [tab: 'network'] }>();

const form = defineModel<SettingsForm>({ required: true });
</script>

<template>
	<div class="space-y-5">
		<h2 class="text-lg font-semibold text-highlighted">{{ $t('RTMP') }}</h2>

		<div class="space-y-3">
			<SettingsToggle v-model="form.rtmp.enable" name="rtmp.enable" :label="$t('RTMP server')" :disabled="form.rtmp.enable_tls" />
			<SettingsToggle v-model="form.rtmp.enable_tls" name="rtmp.enable_tls" :label="$t('RTMPS server')" />
			<p v-if="form.rtmp.enable_tls && !form.tls.auto" class="text-sm text-muted">
				{{ $t('Requires activation') }}
				<ULink as="button" type="button" class="text-primary" @click="$emit('tab', 'network')">TLS/HTTPS</ULink>.
			</p>
		</div>

		<USeparator />

		<div class="grid gap-5 md:grid-cols-4">
			<SettingsField
				v-slot="{ disabled }"
				name="rtmp.address"
				:label="$t('RTMP Port')"
				:help="$t('RTMP server listen address.')"
				:disabled="!form.rtmp.enable && !form.rtmp.enable_tls"
			>
				<SettingsNumber v-model="form.rtmp.address" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="rtmp.address_tls"
				:label="$t('RTMPS Port')"
				:help="$t('RTMPS server listen address.')"
				:disabled="!form.rtmp.enable_tls || !form.tls.auto"
			>
				<SettingsNumber v-model="form.rtmp.address_tls" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="rtmp.app"
				:label="$t('App')"
				:help="$t('RTMP app for publishing.')"
				:disabled="!form.rtmp.enable"
				class="md:col-span-2"
			>
				<UInput v-model="form.rtmp.app" class="w-full" :disabled="disabled" />
			</SettingsField>
		</div>

		<SettingsField
			v-slot="{ disabled }"
			name="rtmp.token"
			:label="$t('Token')"
			:help="$t(`RTMP token for publishing and playing. The token is the value of the URL query parameter 'token.'`)"
			:disabled="!form.rtmp.enable"
		>
			<SettingsPassword v-model="form.rtmp.token" :disabled="disabled" />
		</SettingsField>
	</div>
</template>
