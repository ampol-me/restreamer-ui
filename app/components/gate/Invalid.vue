<script setup lang="ts">
defineProps<{ address: string }>();

const reload = () => window.location.reload();
</script>

<template>
	<div class="mx-auto max-w-lg py-16">
		<UAlert
			color="error"
			variant="subtle"
			icon="i-lucide-unplug"
			:title="$t('No connection to the core')"
			:description="$t('The core at {address} could not be reached or is not a datarhei Core.', { address })"
			:actions="[{ label: $t('Retry'), icon: 'i-lucide-refresh-cw', color: 'error', variant: 'solid', onClick: reload }]"
		/>
	</div>
</template>
