<script setup lang="ts">
// Sound level of a source or of the programme. The scale is in decibels below full level:
// the bar is full at 0 dB, and empty from -48 dB down.
const props = defineProps<{ level: number; label: string }>();

const FLOOR_DB = -48;

const db = computed(() => (props.level > 0 ? Math.max(FLOOR_DB, 20 * Math.log10(props.level)) : FLOOR_DB));
const percent = computed(() => Math.round(((db.value - FLOOR_DB) / -FLOOR_DB) * 100));
// Close to full level the sound clips on air.
const hot = computed(() => db.value > -3);
</script>

<template>
	<div
		class="h-2 overflow-hidden rounded-full bg-accented"
		role="meter"
		:aria-label="label"
		aria-valuemin="0"
		aria-valuemax="100"
		:aria-valuenow="percent"
		:aria-valuetext="hot ? $t('Too loud') : undefined"
	>
		<div class="h-full rounded-full" :class="hot ? 'bg-error' : 'bg-success'" :style="{ width: `${percent}%` }" />
	</div>
</template>
