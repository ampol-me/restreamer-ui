<script setup lang="ts">
import * as S from '#shared/sources/virtualaudio';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import { layouts, samplings } from '#shared/sources/options';

// Port of legacy/src/views/Edit/Sources/VirtualAudio.js
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

const sources = computed(() => [
	{ value: 'silence', label: t('Silence') },
	{ value: 'noise', label: t('Noise') },
	{ value: 'sine', label: t('Sine') },
]);

const colors = computed(() => ['white', 'pink', 'brown', 'blue', 'violet', 'velvet'].map((color) => ({ value: color, label: t(color) })));
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select audio source:') }}</p>
		<UFormField :label="$t('Source')">
			<USelect :model-value="settings.source" :items="sources" class="w-full" @update:model-value="(v) => change('source', String(v))" />
		</UFormField>

		<template v-if="settings.source === 'silence'">
			<SourceSelectCustom
				:model-value="settings.sampling"
				:options="samplings"
				:label="$t('Sampling')"
				:custom-label="$t('Custom sampling (Hz)')"
				:help="$t('The sample rate of the audio stream.')"
				allow-custom
				@update:model-value="(v) => change('sampling', v)"
			/>
			<SourceSelectCustom
				:model-value="settings.layout"
				:options="layouts"
				:label="$t('Layout')"
				:help="$t('The layout of the audio stream.')"
				@update:model-value="(v) => change('layout', v)"
			/>
		</template>

		<template v-if="settings.source === 'noise'">
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
				<UFormField :label="$t('Color')" :help="$t('The noise color')">
					<USelect :model-value="settings.color" :items="colors" class="w-full" @update:model-value="(v) => change('color', String(v))" />
				</UFormField>
				<UFormField :label="$t('Amplitude')" :help="$t('The amplitude (0.0 - 1.0) of the generated audio stream')">
					<UInput :model-value="String(settings.amplitude)" class="w-full" @update:model-value="(v) => change('amplitude', String(v))" />
				</UFormField>
			</div>
		</template>

		<template v-if="settings.source === 'sine'">
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
				<UFormField :label="$t('Frequency (Hz)')" :help="$t('The carrier frequency')">
					<UInput :model-value="String(settings.frequency)" class="w-full" @update:model-value="(v) => change('frequency', String(v))" />
				</UFormField>
				<UFormField :label="$t('Beep factor')" :help="$t('Enable a periodic beep every second with this value times the carrier frequency')">
					<UInput :model-value="String(settings.beepfactor)" class="w-full" @update:model-value="(v) => change('beepfactor', String(v))" />
				</UFormField>
			</div>
		</template>

		<UButton :label="$t('Probe')" @click="probe" />
	</div>
</template>
