<script setup lang="ts">
// Broadcast tally status. It always carries a word: red and green are never the only signal.
const props = defineProps<{ state: 'live' | 'preview' | 'ready' | 'off' | 'error'; label: string }>();

const tone = computed(() => {
	switch (props.state) {
		case 'live':
		case 'error':
			return 'text-(--tally-live)';
		case 'preview':
		case 'ready':
			return 'text-(--tally-ready)';
		default:
			return 'text-muted';
	}
});
</script>

<template>
	<span class="ph-label inline-flex items-center gap-1.5 rounded-full border border-current bg-elevated py-[3px] pr-2.5 pl-2 whitespace-nowrap" :class="tone">
		<span
			class="size-2 rounded-full"
			:class="[
				state === 'ready' ? 'shadow-[inset_0_0_0_2px_currentColor]' : 'bg-current',
				state === 'off' ? 'opacity-50' : '',
				state === 'live' ? 'animate-[pulse_1s_steps(2,jump-none)_infinite]' : '',
			]"
		/>
		{{ label }}
	</span>
</template>
