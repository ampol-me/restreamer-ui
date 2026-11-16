<script setup lang="ts">
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import type { WizardChange } from '#shared/sources/wizard';
import * as W from '#shared/sources/wizard/avfoundation';

// Port of legacy/src/views/Edit/Wizard/Sources/AVFoundation.js
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

const { t } = useI18n();

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

const settings = computed(() => W.initSettings(props.settings));

const videoDevices = computed(() => {
	const devices = props.knownDevices.filter((device) => device.media === 'video').map((device) => ({ value: device.id, label: device.name }));

	return devices.length === 0
		? [{ value: 'none', label: t('No input device available'), disabled: true }]
		: [{ value: 'default', label: t('Default') }, ...devices];
});

const audioDevices = computed(() => {
	const devices = props.knownDevices.filter((device) => device.media === 'audio').map((device) => ({ value: device.id, label: device.name }));
	const none = { value: 'none', label: t('None') };

	return devices.length === 0 ? [none] : [{ value: 'default', label: t('Default') }, none, ...devices];
});
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select a device:') }}</p>
		<UFormField :label="$t('Video device')">
			<USelect :model-value="settings.vindex" :items="videoDevices" class="w-full" @update:model-value="(v) => update('vindex', String(v))" />
		</UFormField>
		<div>
			<UFormField :label="$t('Audio Device')">
				<USelect :model-value="settings.aindex" :items="audioDevices" class="w-full" @update:model-value="(v) => update('aindex', String(v))" />
			</UFormField>
			<div class="flex justify-end">
				<UButton size="xs" variant="ghost" icon="i-lucide-refresh-cw" :label="$t('Refresh')" @click="emit('refresh')" />
			</div>
		</div>
	</div>
</template>
