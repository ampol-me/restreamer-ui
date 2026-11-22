<script setup lang="ts">
import * as S from '#shared/sources/alsa';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import { samplings } from '#shared/sources/options';

// Port of legacy/src/views/Edit/Sources/ALSA.js
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
	...props.knownDevices.filter((device) => device.media === 'audio').map((device) => ({ value: device.id.replace(/^hw:/, ''), label: device.name })),
]);
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select a device:') }}</p>
		<div>
			<SourceSelectCustom
				:model-value="settings.device"
				:options="devices"
				:label="$t('Audio device')"
				:custom-label="$t('Custom audio device')"
				allow-custom
				@update:model-value="(v) => change('device', v)"
			/>
			<div class="flex justify-end">
				<UButton size="xs" variant="ghost" icon="i-lucide-refresh-cw" :label="$t('Refresh')" @click="emit('refresh')" />
			</div>
		</div>
		<SourceSelectCustom
			:model-value="settings.sampling"
			:options="samplings"
			:label="$t('Sampling')"
			:custom-label="$t('Custom sampling (Hz)')"
			:help="$t('The sample rate of the audio stream.')"
			allow-custom
			@update:model-value="(v) => change('sampling', v)"
		/>
		<div class="grid grid-cols-2 gap-4">
			<UFormField :label="$t('Channels')">
				<UInput :model-value="String(settings.channels)" class="w-full" @update:model-value="(v) => change('channels', String(v))" />
			</UFormField>
			<UFormField :label="$t('Delay (ms)')">
				<UInput :model-value="String(settings.delay)" class="w-full" @update:model-value="(v) => change('delay', String(v))" />
			</UFormField>
		</div>
		<UButton :label="$t('Probe')" @click="probe" />
	</div>
</template>
