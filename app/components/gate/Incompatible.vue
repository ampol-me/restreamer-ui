<script setup lang="ts">
import type { Compatibility } from '~/composables/useRestreamer';

const props = defineProps<{ compatibility: Compatibility }>();

// Report the core first, like the legacy UI did.
const failing = computed(() =>
	props.compatibility.core.compatible ? { type: 'FFmpeg', ...props.compatibility.ffmpeg } : { type: 'datarhei Core', ...props.compatibility.core },
);
</script>

<template>
	<div class="mx-auto max-w-lg py-16">
		<UAlert
			color="warning"
			variant="subtle"
			icon="i-lucide-triangle-alert"
			:title="$t('Incompatible {type} version', { type: failing.type })"
			:description="$t('This UI requires {type} {want}, but the connected version is {have}.', failing)"
		/>
	</div>
</template>
