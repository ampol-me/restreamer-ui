<script setup lang="ts">
// Blocks the page while an upload or save runs, so nothing is edited halfway through.
defineProps<{ active: boolean }>();
</script>

<template>
	<div v-if="active" class="fixed inset-0 z-50 flex items-center justify-center bg-default/60" role="status" aria-live="polite">
		<UIcon name="i-lucide-loader-circle" class="size-10 animate-spin text-muted" />
	</div>
</template>
