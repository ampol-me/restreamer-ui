<script setup lang="ts">
import { SRT_PASSPHRASE_MAX, type SettingsForm } from '#shared/settings/config';

const form = defineModel<SettingsForm>({ required: true });
</script>

<template>
	<div class="space-y-5">
		<h2 class="text-lg font-semibold text-highlighted">{{ $t('SRT') }}</h2>

		<SettingsToggle v-model="form.srt.enable" name="srt.enable" :label="$t('SRT server')" />

		<USeparator />

		<div class="grid gap-5 md:grid-cols-3">
			<SettingsField v-slot="{ disabled }" name="srt.address" :label="$t('Port')" :help="$t('SRT server listen address.')" :disabled="!form.srt.enable">
				<SettingsNumber v-model="form.srt.address" :disabled="disabled" />
			</SettingsField>

			<SettingsField
				v-slot="{ disabled }"
				name="srt.token"
				:label="$t('Token')"
				:help="$t(`SRT token for publishing and playing. The token is the value of the streamid parameter 'token.'`)"
				:disabled="!form.srt.enable"
				class="md:col-span-2"
			>
				<SettingsPassword v-model="form.srt.token" :disabled="disabled" />
			</SettingsField>
		</div>

		<SettingsField
			v-slot="{ disabled }"
			name="srt.passphrase"
			:label="$t('Passphrase')"
			:help="$t('Passphrase for SRT encryption.')"
			:disabled="!form.srt.enable"
		>
			<SettingsPassword v-model="form.srt.passphrase" :disabled="disabled" :maxlength="SRT_PASSPHRASE_MAX" />
		</SettingsField>
	</div>
</template>
