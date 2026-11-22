<script setup lang="ts">
import type { ServiceIcon } from '#shared/services/types';

// One destination on the "add publication" page. A service this core cannot serve is shown, not
// hidden, with the reason: people look for it by name.
defineProps<{ service: { name: string; icon: ServiceIcon; compatible: boolean }; large?: boolean }>();
defineEmits<{ pick: [] }>();
</script>

<template>
	<button
		type="button"
		class="flex w-full items-center rounded-lg border border-default bg-elevated text-left"
		:class="[large ? 'min-h-20 gap-4 p-4' : 'min-h-14 gap-3 px-3 py-2', service.compatible ? 'hover:border-accented' : 'cursor-not-allowed opacity-60']"
		:aria-disabled="!service.compatible"
		@click="service.compatible && $emit('pick')"
	>
		<PublicationServiceIcon :icon="service.icon" class="shrink-0" :class="large ? 'size-10' : 'size-7'" />
		<span class="min-w-0 flex-1">
			<span class="block truncate text-highlighted" :class="large ? 'font-semibold' : 'text-sm'">{{ service.name }}</span>
			<span v-if="!service.compatible" class="block text-xs text-muted">{{ $t('Not possible with this server') }}</span>
		</span>
	</button>
</template>
