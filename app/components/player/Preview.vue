<script setup lang="ts">
import type { LogoPosition } from '#shared/player/settings';

// The channel's stream with the poster and logo the public player will show.
const props = defineProps<{
	src: string;
	poster: string;
	autoplay: boolean;
	logo: { image: string; position: LogoPosition; link: string };
}>();

const corner = computed(
	() =>
		({
			'top-left': 'top-3 left-3',
			'top-right': 'top-3 right-3',
			'bottom-left': 'bottom-14 left-3',
			'bottom-right': 'bottom-14 right-3',
		})[props.logo.position] ?? 'top-3 left-3',
);
</script>

<template>
	<div class="relative">
		<HlsPlayer :src="src" :poster="poster" :autoplay="autoplay" />

		<component
			:is="logo.link ? 'a' : 'div'"
			v-if="logo.image"
			:href="logo.link || undefined"
			:target="logo.link ? '_blank' : undefined"
			rel="noopener"
			class="absolute max-h-1/4 max-w-1/4"
			:class="[corner, { 'pointer-events-none': !logo.link }]"
		>
			<img :src="logo.image" alt="" class="max-h-full max-w-full object-contain" />
		</component>
	</div>
</template>
