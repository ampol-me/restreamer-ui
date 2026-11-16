<script setup lang="ts">
import * as S from '#shared/sources/avfoundation';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import { formats, framerates, sizes } from '#shared/sources/options';

// Port of legacy/src/views/Edit/Sources/AVFoundation.js
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

const videoDevices = computed(() => [
	{ value: 'default', label: t('Default') },
	...props.knownDevices.filter((device) => device.media === 'video').map((device) => ({ value: device.id, label: device.name })),
]);

const audioDevices = computed(() => [
	{ value: 'default', label: t('Default') },
	{ value: 'none', label: t('None') },
	...props.knownDevices.filter((device) => device.media === 'audio').map((device) => ({ value: device.id, label: device.name })),
]);
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select a device:') }}</p>
		<SourceSelectCustom
			:model-value="settings.vindex"
			:options="videoDevices"
			:label="$t('Video device')"
			:custom-label="$t('Custom video index')"
			allow-custom
			@update:model-value="(v) => change('vindex', v)"
		/>
		<div>
			<SourceSelectCustom
				:model-value="settings.aindex"
				:options="audioDevices"
				:label="$t('Audio device')"
				:custom-label="$t('Custom audio index')"
				allow-custom
				@update:model-value="(v) => change('aindex', v)"
			/>
			<div class="flex justify-end">
				<UButton size="xs" variant="ghost" icon="i-lucide-refresh-cw" :label="$t('Refresh')" @click="emit('refresh')" />
			</div>
		</div>
		<SourceSelectCustom
			:model-value="settings.format"
			:options="formats"
			:label="$t('Format')"
			:custom-label="$t('Custom format')"
			allow-custom
			@update:model-value="(v) => change('format', v)"
		/>
		<SourceSelectCustom
			:model-value="settings.framerate"
			:options="framerates"
			:label="$t('Framerate')"
			:custom-label="$t('Custom framerate')"
			allow-custom
			@update:model-value="(v) => change('framerate', v)"
		/>
		<SourceSelectCustom
			:model-value="settings.size"
			:options="sizes"
			:label="$t('Size')"
			:custom-label="$t('Custom size')"
			allow-auto
			allow-custom
			@update:model-value="(v) => change('size', v)"
		/>
		<UCheckbox :model-value="settings.cursor === true" :label="$t('Capture cursor')" @update:model-value="change('cursor', !settings.cursor)" />
		<UCheckbox :model-value="settings.clicks === true" :label="$t('Capture clicks')" @update:model-value="change('clicks', !settings.clicks)" />
		<UButton :label="$t('Probe')" @click="probe" />
	</div>
</template>
