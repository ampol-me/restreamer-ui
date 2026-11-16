<script setup lang="ts">
import { licenseInfo, licenses } from '#shared/license';

// Stored metadata may carry a license this list does not know; it is kept until changed.
const license = defineModel<string>({ required: true });

const items = computed<string[]>(() => ((licenses as readonly string[]).includes(license.value) ? [...licenses] : [license.value, ...licenses]));

const info = computed(() => licenseInfo(license.value));
</script>

<template>
	<div class="space-y-4">
		<UFormField :label="$t('Creative Commons')" class="sm:max-w-xs">
			<USelect v-model="license" :items="items" class="w-full" />
		</UFormField>

		<div v-if="info" class="flex flex-col gap-3 rounded-lg bg-elevated p-4 sm:flex-row sm:items-start">
			<a :href="info.link" target="_blank" rel="noopener" class="shrink-0">
				<img :src="`/licenses/${info.image}`" :alt="license" class="h-8" />
			</a>
			<p class="text-sm text-default">{{ $t(info.description) }}</p>
		</div>
	</div>
</template>
