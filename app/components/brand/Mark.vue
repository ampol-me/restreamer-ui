<script setup lang="ts">
// The Safe Frame mark. On light grounds the frame is navy, on dark (or navy) grounds white;
// at 32px and below the heavier "small" drawing is used, as the brand kit prescribes.
const props = withDefaults(defineProps<{ size?: number; ground?: 'auto' | 'dark' }>(), { size: 32, ground: 'auto' });

const asset = useAsset();
const suffix = computed(() => (props.size <= 32 ? '-small' : ''));
const light = computed(() => asset(`brand/phila-mark${suffix.value}.svg`));
const dark = computed(() => asset(`brand/phila-mark-reverse${suffix.value}.svg`));
</script>

<template>
	<span class="inline-flex shrink-0" :style="{ width: `${size}px`, height: `${size}px` }">
		<img v-if="ground === 'dark'" :src="dark" alt="" :width="size" :height="size" />
		<template v-else>
			<img :src="light" alt="" :width="size" :height="size" class="dark:hidden" />
			<img :src="dark" alt="" :width="size" :height="size" class="hidden dark:block" />
		</template>
	</span>
</template>
