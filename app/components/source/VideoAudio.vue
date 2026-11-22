<script setup lang="ts">
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';

// Port of legacy/src/views/Edit/Sources/VideoAudio.js: the pseudo source for selecting the audio of the video source has no form.
// Props and events are declared so that it can stand in wherever a source form is expected.
withDefaults(
	defineProps<{
		settings?: SourceSettings;
		config?: Record<string, unknown>;
		skills?: Record<string, unknown> | null;
		knownDevices?: SourceDevice[];
	}>(),
	{ settings: () => ({}), config: () => ({}), skills: null, knownDevices: () => [] },
);

defineEmits<{
	'update:settings': [settings: SourceSettings];
	probe: [settings: SourceSettings, inputs: SourceInput[]];
	refresh: [];
}>();
</script>

<template>
	<span class="hidden" />
</template>
