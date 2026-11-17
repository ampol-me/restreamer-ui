<script setup lang="ts">
import type { Component } from 'vue';

import Sources, { availableSources as offeredSources, initConfig, initStore, isSupported, knownDevices } from '#shared/sources';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';

import {
	SourceAlsa,
	SourceAudioLoop,
	SourceAvfoundation,
	SourceNetwork,
	SourceNoAudio,
	SourcePlaylist,
	SourceRaspicam,
	SourceV4l,
	SourceVideoAudio,
	SourceVideoLoop,
	SourceVirtualAudio,
	SourceVirtualVideo,
} from '#components';

// Port of legacy/src/views/Edit/SourceSelect.js: picks the source of the video or audio of a channel
// and shows the form of the picked source.
interface SelectedSource {
	type?: string;
	settings?: SourceSettings;
}

interface Skills {
	ffmpeg?: { version?: string };
	sources?: Record<string, SourceDevice[] | undefined>;
	[key: string]: unknown;
}

const props = withDefaults(
	defineProps<{
		type: 'video' | 'audio';
		source?: SelectedSource;
		/** The `source` object of the core config: one slice per source id. */
		config?: Record<string, unknown> | null;
		skills?: Skills;
		/** The ids of the sources to offer. Default: the sources the core knows (`skills.sources`). */
		availableSources?: string[];
		/** Stores an uploaded file for the channel and resolves to its path; bind as `@store` or `:on-store`. */
		onStore?: (name: string, data: ArrayBuffer) => Promise<string> | string;
	}>(),
	{ source: () => ({}), config: null, skills: () => ({}), availableSources: undefined, onStore: undefined },
);

const emit = defineEmits<{
	'update:source': [source: { type: string; settings: SourceSettings }];
	/** `type` is the id of the source that is probed. */
	probe: [type: string, settings: SourceSettings, inputs: SourceInput[]];
	refresh: [];
}>();

const forms: Record<string, Component> = {
	network: SourceNetwork,
	alsa: SourceAlsa,
	avfoundation: SourceAvfoundation,
	video4linux2: SourceV4l,
	raspicam: SourceRaspicam,
	virtualaudio: SourceVirtualAudio,
	virtualvideo: SourceVirtualVideo,
	noaudio: SourceNoAudio,
	videoaudio: SourceVideoAudio,
	videoloop: SourceVideoLoop,
	audioloop: SourceAudioLoop,
	playlist: SourcePlaylist,
};

const selected = ref(props.source.type);

// The settings of every source, so that they come back when the user switches between sources.
const store = ref(initStore(props.source) as Record<string, SourceSettings | undefined>);

// A source that is set from outside (the page loaded or reset the channel) replaces what is kept here.
// The echo of our own update carries the stored settings object and changes nothing.
watch(
	() => props.source,
	(source) => {
		selected.value = source.type;
		if (source.type !== undefined && store.value[source.type] !== source.settings) {
			store.value = { ...store.value, [source.type]: source.settings };
		}
	},
);

const ffversion = computed(() => props.skills.ffmpeg?.version ?? '0.0.0');
const config = computed(() => initConfig(props.config) as Record<string, Record<string, unknown>>);

const offered = computed(() => offeredSources(props.type, props.availableSources ?? Object.keys(props.skills.sources ?? {}), ffversion.value));

// As in legacy, the form of the stored source is shown even if that source is not offered (anymore),
// as long as it works with the ffmpeg version.
const form = computed(() => {
	const id = selected.value;
	const source = id === undefined ? null : Sources.Get(id);
	if (!id || source === null || !isSupported(source, ffversion.value)) {
		return null;
	}

	// Only the loop sources upload a file; on any other form the handler would end up as a DOM listener.
	const uploads = id === 'videoloop' || id === 'audioloop';

	return { id, component: forms[id], devices: knownDevices(props.skills.sources, id), onStore: uploads ? props.onStore : undefined };
});

function select(id: string) {
	selected.value = id;
	emit('update:source', { type: id, settings: store.value[id] ?? {} });
}

function change(id: string, settings: SourceSettings) {
	store.value = { ...store.value, [id]: settings };
	emit('update:source', { type: id, settings });
}
</script>

<template>
	<div class="space-y-4">
		<p v-if="offered.length === 0">{{ $t('No sources available') }}</p>
		<div v-else class="grid grid-cols-2 gap-2 md:grid-cols-3">
			<UButton
				v-for="s in offered"
				:key="s.id"
				:icon="s.icon"
				:label="$t(s.name)"
				:color="s.id === selected ? 'primary' : 'neutral'"
				:variant="s.id === selected ? 'solid' : 'outline'"
				:aria-pressed="s.id === selected"
				size="lg"
				block
				class="flex-col py-4"
				@click="select(s.id)"
			/>
		</div>

		<component
			:is="form.component"
			v-if="form"
			:key="form.id"
			:known-devices="form.devices"
			:skills="skills"
			:config="config[form.id]"
			:settings="store[form.id]"
			:on-store="form.onStore"
			@update:settings="(settings: SourceSettings) => change(form!.id, settings)"
			@probe="(settings: SourceSettings, inputs: SourceInput[]) => emit('probe', form!.id, settings, inputs)"
			@refresh="emit('refresh')"
		/>
	</div>
</template>
