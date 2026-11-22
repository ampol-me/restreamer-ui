<script setup lang="ts">
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import type { WizardChange } from '#shared/sources/wizard';
import * as W from '#shared/sources/wizard/raspicam';

// Port of legacy/src/views/Edit/Wizard/Sources/Raspicam.js
const props = withDefaults(
	defineProps<{
		settings?: SourceSettings;
		config?: Record<string, unknown> | null;
		skills?: Record<string, unknown> | null;
		knownDevices?: SourceDevice[];
	}>(),
	{ settings: () => ({}), config: null, skills: null, knownDevices: () => [] },
);

const emit = defineEmits<{
	/** Legacy `onChange(type, settings, inputs, ready)`; the type is that of the wizard source (shared/sources/wizard). */
	change: [settings: SourceSettings, inputs: SourceInput[], ready: boolean];
	refresh: [];
}>();

const context = () => ({ settings: props.settings, knownDevices: props.knownDevices });

function report(change: WizardChange) {
	emit('change', change.settings, change.inputs, change.ready);
}

function update(what: string, value?: unknown) {
	report(W.update(context(), what, value));
}

onMounted(() => report(W.change(context())));

// Unlike legacy, which reports only once, a refreshed device list is reported too:
// whether the wizard may go on depends on the devices that were found.
watch(
	() => props.knownDevices,
	() => report(W.change(context())),
);

const settings = computed(() => W.initSettings(props.settings, props.knownDevices));

const devices = computed(() => W.initDevices(props.knownDevices).map((device) => ({ value: device.id, label: `${device.name} (${device.id})` })));
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select a device:') }}</p>
		<UFormField :label="$t('Video device')">
			<USelect :model-value="settings.device" :items="devices" class="w-full" @update:model-value="(v) => update('device', String(v))" />
		</UFormField>
	</div>
</template>
