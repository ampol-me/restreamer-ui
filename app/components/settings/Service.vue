<script setup lang="ts">
import { CORE_CONFIG_FIELD, type SettingsForm } from '#shared/settings/config';

const form = defineModel<SettingsForm>({ required: true });
// A complete core config as JSON. When given, it is saved instead of the form.
const coreConfig = defineModel<string>('coreConfig', { required: true });
</script>

<template>
	<div class="space-y-5">
		<div>
			<h2 class="text-lg font-semibold text-highlighted">{{ $t('Service') }}</h2>
			<p class="text-sm text-muted">
				{{ $t('Setting for connection to the service.') }}
				<ULink to="https://service.datarhei.com" target="_blank" class="text-primary">{{ $t('More about the service') }}</ULink>.
			</p>
		</div>

		<SettingsToggle v-model="form.service.enable" name="service.enable" :label="$t('Restreamer Service')" />

		<SettingsField name="id" :label="$t('Node ID')" :help="$t('Unique ident on the service.')">
			<UInput v-model="form.id" class="w-full" disabled />
		</SettingsField>

		<SettingsField v-slot="{ disabled }" name="name" :label="$t('Name')" :help="$t('Human readable name on the service.')" :disabled="!form.service.enable">
			<UInput v-model="form.name" class="w-full" :disabled="disabled" />
		</SettingsField>

		<SettingsField
			v-slot="{ disabled }"
			name="service.token"
			:label="$t('Token')"
			:help="$t('Service token for monitoring.')"
			:disabled="!form.service.enable"
		>
			<UInput v-model="form.service.token" class="w-full" :disabled="disabled" />
		</SettingsField>

		<SettingsField :name="CORE_CONFIG_FIELD" :label="$t('Config')" :help="$t('Custom JSON config for datarhei Core.')">
			<UTextarea v-model="coreConfig" class="w-full font-mono" :rows="10" :disabled="!form.service.enable" spellcheck="false" />
		</SettingsField>
	</div>
</template>
