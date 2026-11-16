<script setup lang="ts">
import * as S from '#shared/sources/framebuffer';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import { framerates } from '#shared/sources/options';

// Port of legacy/src/views/Edit/Sources/Framebuffer.js. Like in legacy the source is not registered
// (shared/sources/index.ts), so the source select never shows this form.
const props = withDefaults(
	defineProps<{
		settings?: SourceSettings;
		config?: Record<string, unknown>;
		skills?: Record<string, unknown> | null;
		knownDevices?: SourceDevice[];
	}>(),
	{ settings: () => ({}), config: () => ({}), skills: null, knownDevices: () => [] },
);

const emit = defineEmits<{
	'update:settings': [settings: SourceSettings];
	probe: [settings: SourceSettings, inputs: SourceInput[]];
	refresh: [];
}>();

const { t } = useI18n();

const settings = computed(() => S.initSettings(props.settings));

function change(what: string, value: unknown) {
	emit('update:settings', { ...settings.value, [what]: value });
}

function probe() {
	emit('probe', settings.value, S.createInputs(settings.value));
}

const devices = computed(() => [
	{ value: 'none', label: t('Choose an input device ...'), disabled: true },
	...props.knownDevices.filter((device) => device.extra !== '').map((device) => ({ value: device.id, label: device.name + ' (' + device.extra + ')' })),
]);
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select a device:') }}</p>
		<SourceSelectCustom :model-value="settings.device" :options="devices" :label="$t('Device')" @update:model-value="(v) => change('device', v)" />
		<SourceSelectCustom
			:model-value="settings.framerate"
			:options="framerates"
			:label="$t('Framerate')"
			:custom-label="$t('Custom framerate')"
			allow-custom
			@update:model-value="(v) => change('framerate', v)"
		/>
		<UButton :label="$t('Probe')" @click="probe" />
	</div>
</template>
