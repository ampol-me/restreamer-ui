<script setup lang="ts">
import type { SettingsForm } from '#shared/settings/config';

const form = defineModel<SettingsForm>({ required: true });
</script>

<template>
	<div class="space-y-5">
		<h2 class="text-lg font-semibold text-highlighted">{{ $t('Authorization') }}</h2>

		<h3 class="font-medium text-highlighted">{{ $t('Basic') }}</h3>

		<!-- Always locked, as in legacy: this UI enforces the login. -->
		<SettingsToggle
			v-model="form.api.auth.enable"
			name="api.auth.enable"
			:label="$t('Login/JWT authorization')"
			:help="$t('Enabling authorization is strongly advised. Otherwise, anybody can access this instance.')"
			disabled
		/>

		<SettingsField
			v-slot="{ disabled }"
			name="api.auth.username"
			:label="$t('Username')"
			:help="$t('Username for authorization.')"
			:disabled="!form.api.auth.enable"
		>
			<UInput v-model="form.api.auth.username" class="w-full" autocomplete="off" :disabled="disabled" />
		</SettingsField>

		<SettingsField
			v-slot="{ disabled }"
			name="api.auth.password"
			:label="$t('Password')"
			:help="$t('Password for authorization.')"
			:disabled="!form.api.auth.enable"
		>
			<SettingsPassword v-model="form.api.auth.password" :disabled="disabled" />
		</SettingsField>
	</div>
</template>
