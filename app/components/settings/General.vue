<script setup lang="ts">
import type { SettingsForm } from '#shared/settings/config';

defineProps<{ updateAvailable: boolean; updateUrl: string; outdated: boolean }>();
defineEmits<{ restart: [] }>();

const form = defineModel<SettingsForm>({ required: true });
// Both are preferences of this browser, not values of the core config.
const checkForUpdates = defineModel<boolean>('checkForUpdates', { required: true });
const expert = defineModel<boolean>('expert', { required: true });
</script>

<template>
	<div class="space-y-5">
		<div>
			<h2 class="text-lg font-semibold text-highlighted">{{ $t('General') }}</h2>
			<p class="text-sm text-muted">{{ $t('All important system settings.') }}</p>
		</div>

		<div class="space-y-2">
			<USwitch v-model="checkForUpdates" :label="$t('Check for updates')" />
			<UAlert v-if="updateAvailable" color="success" variant="subtle" icon="i-lucide-circle-arrow-up">
				<template #title>
					<ULink :to="updateUrl" target="_blank" class="underline">
						{{ $t('There are updates available. Here you get more information.') }}
					</ULink>
				</template>
			</UAlert>
		</div>

		<SettingsToggle v-model="form.update_check" name="update_check" :label="$t('Send anonymous metrics (helps us for future development)')" />

		<USwitch v-model="expert" :label="$t('Expert mode')" />

		<USeparator />

		<div class="flex flex-wrap items-center gap-3">
			<UButton color="neutral" variant="outline" icon="i-lucide-rotate-cw" :label="$t('Restart')" @click="$emit('restart')" />
			<span v-if="outdated" class="text-sm text-muted">{{ $t('The application is using an older version of the settings.') }}</span>
		</div>
	</div>
</template>
