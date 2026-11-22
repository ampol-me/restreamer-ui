<script setup lang="ts">
import * as S from '#shared/sources/raspicam';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import { formats, framerates, sizes } from '#shared/sources/options';

// Port of legacy/src/views/Edit/Sources/Raspicam.js
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
	...props.knownDevices.filter((device) => device.media === 'video').map((device) => ({ value: device.id, label: device.name + ' (' + device.id + ')' })),
]);
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select a device:') }}</p>
		<div>
			<SourceSelectCustom
				:model-value="settings.device"
				:options="devices"
				:label="$t('Video device')"
				@update:model-value="(v) => change('device', v)"
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
			allow-custom
			@update:model-value="(v) => change('size', v)"
		/>
		<UButton :label="$t('Probe')" @click="probe" />
	</div>
</template>
