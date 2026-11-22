<script setup lang="ts">
import type { StudioEngine } from '~/composables/useStudioEngine';

// A small live picture of one source, so it can be told from the others before it goes on stage.
const props = defineProps<{ engine: StudioEngine; id: string }>();

const canvas = ref<HTMLCanvasElement | null>(null);
let timer: ReturnType<typeof setInterval> | null = null;

const paint = () => {
	if (canvas.value) props.engine.drawThumbnail(props.id, canvas.value);
};

onMounted(() => {
	paint();
	timer = setInterval(paint, 250);
});
onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});
</script>

<template>
	<canvas ref="canvas" width="160" height="90" class="aspect-video w-full rounded-md bg-black" aria-hidden="true" />
</template>
