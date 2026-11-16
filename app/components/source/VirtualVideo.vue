<script setup lang="ts">
import * as S from '#shared/sources/virtualvideo';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import { framerates, sizes } from '#shared/sources/options';

// Port of legacy/src/views/Edit/Sources/VirtualVideo.js
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

const patterns = ['testsrc', 'testsrc2', 'pal75bars', 'pal100bars', 'rgbtestsrc', 'smptebars', 'smptehdbars', 'yuvtestsrc'];

const sources = computed(() => [
	{ value: 'none', label: t('Select source ...'), disabled: true },
	{ value: 'testsrc', label: t('Test pattern') },
	{ value: 'testsrc2', label: t('Test pattern (extended)') },
	{ value: 'rgbtestsrc', label: t('RGB test pattern') },
	{ value: 'yuvtestsrc', label: t('YUV test pattern') },
	{ value: 'pal75bars', label: 'EBU PAL 75%' },
	{ value: 'pal100bars', label: 'EBU PAL 100%' },
	{ value: 'smptebars', label: 'SMPTE EG 1-1990' },
	{ value: 'smptehdbars', label: 'SMPTE RP 219-2002' },
	{ value: 'life', label: 'Game Of Life' },
]);
</script>

<template>
	<div class="space-y-4">
		<p>{{ $t('Select video source:') }}</p>
		<UFormField :label="$t('Source')">
			<USelect :model-value="settings.source" :items="sources" class="w-full" @update:model-value="(v) => change('source', String(v))" />
		</UFormField>

		<template v-if="patterns.includes(settings.source)">
			<SourceSelectCustom
				:model-value="settings.fps"
				:options="framerates"
				:label="$t('Framerate')"
				:custom-label="$t('Custom framerate')"
				allow-custom
				@update:model-value="(v) => change('fps', v)"
			/>
			<SourceSelectCustom
				:model-value="settings.size"
				:options="sizes"
				:label="$t('Size')"
				:custom-label="$t('Custom size')"
				allow-custom
				@update:model-value="(v) => change('size', v)"
			/>
		</template>

		<template v-if="settings.source === 'life'">
			<SourceSelectCustom
				:model-value="settings.fps"
				:options="framerates"
				:label="$t('Framerate')"
				:custom-label="$t('Custom framerate')"
				allow-custom
				@update:model-value="(v) => change('fps', v)"
			/>
			<SourceSelectCustom
				:model-value="settings.size"
				:options="sizes"
				:label="$t('Size')"
				:custom-label="$t('Custom size')"
				allow-custom
				@update:model-value="(v) => change('size', v)"
			/>
			<SourceSelectCustom
				:model-value="settings.scale"
				:options="sizes"
				:label="$t('Scale')"
				:custom-label="$t('Custom scale')"
				allow-custom
				@update:model-value="(v) => change('scale', v)"
			/>
			<UFormField :label="$t('Rule')">
				<UInput :model-value="String(settings.rule)" class="w-full" @update:model-value="(v) => change('rule', String(v))" />
			</UFormField>
			<UFormField :label="$t('Mold')">
				<UInput :model-value="String(settings.mold)" class="w-full" @update:model-value="(v) => change('mold', String(v))" />
			</UFormField>
			<UFormField :label="$t('Ratio')">
				<UInput :model-value="String(settings.ratio)" class="w-full" @update:model-value="(v) => change('ratio', String(v))" />
			</UFormField>
			<UFormField :label="$t('Death color')">
				<UInput :model-value="String(settings.death_color)" class="w-full" @update:model-value="(v) => change('death_color', String(v))" />
			</UFormField>
			<UFormField :label="$t('Life color')">
				<UInput :model-value="String(settings.life_color)" class="w-full" @update:model-value="(v) => change('life_color', String(v))" />
			</UFormField>
			<UFormField :label="$t('Flags')">
				<UInput :model-value="String(settings.flags)" class="w-full" @update:model-value="(v) => change('flags', String(v))" />
			</UFormField>
		</template>

		<UButton :label="$t('Probe')" :disabled="settings.source === 'none'" @click="probe" />
	</div>
</template>
