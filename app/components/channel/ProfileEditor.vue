<script setup lang="ts">
import type { CoreSkills, ProbeResult } from '#shared/core/types';
import * as E from '#shared/ingest/editor';
import type { ProbeStatus } from '#shared/ingest/wizard';
import { defaultVideoCodecs, type MetadataIO, type MetadataProfile, type MetadataProfileTrack, type MetadataSource } from '#shared/metadata';
import type { SourceInput, SourceSettings } from '#shared/sources/types';

// Source and encoding editor of a channel (legacy Edit/Profile.js): pick and probe the video
// source, choose stream, encoder and filters; then the same for the audio.
const props = defineProps<{
	sources: MetadataSource[];
	profile: MetadataProfile | undefined;
	skills: CoreSkills;
	// The `source` object of the core config.
	config: Record<string, unknown>;
	// Which half to open first.
	startWith: 'video' | 'audio';
	probe: (inputs: MetadataIO[]) => Promise<ProbeResult>;
	refresh: () => Promise<void>;
	store: (name: string, data: ArrayBuffer) => Promise<string>;
}>();

const emit = defineEmits<{
	done: [sources: MetadataSource[], profile: MetadataProfile];
	abort: [];
}>();

const state = ref<E.EditorState>(E.fromMetadata(props.sources, props.profile));
const step = ref<'video' | 'audio'>(props.startWith);

// A stored channel was probed when it was set up; its streams are still what the forms show.
const videoProbe = ref<{ status: ProbeStatus; probing: boolean; log: string[] }>({
	status: state.value.sources.video.streams.length !== 0 ? 'success' : 'none',
	probing: false,
	log: [],
});
const audioProbe = ref<{ status: ProbeStatus; probing: boolean; log: string[] }>({
	status: state.value.sources.audio.streams.length !== 0 || state.value.sources.audio.type === 'noaudio' ? 'success' : 'none',
	probing: false,
	log: [],
});

const refreshing = ref(false);
const logOpen = ref(false);
const logText = ref('');

const videoCodecs = ['copy', ...defaultVideoCodecs];
const audioCodecs = ['copy', 'aac', 'mp3'];

const audioSources = computed(() => E.audioSourceIds(state.value, props.skills));
const audioFromVideo = computed(() => !state.value.profile.custom.selected && state.value.profile.custom.stream >= 0);

async function probeVideo(device: string, settings: SourceSettings, inputs: SourceInput[]) {
	videoProbe.value = { status: 'none', probing: true, log: [] };
	const result = await props.probe(inputs.map((i) => ({ address: i.address, options: i.options.map(String) })));
	const applied = E.applyVideoProbe(state.value, device, settings, inputs, result.streams, props.skills);
	state.value = applied.state;
	videoProbe.value = { status: applied.status, probing: false, log: result.log };
	audioProbe.value = { ...audioProbe.value, status: applied.audioStatus };
}

async function probeAudio(device: string, settings: SourceSettings, inputs: SourceInput[]) {
	audioProbe.value = { status: 'none', probing: true, log: [] };
	const result = await props.probe(inputs.map((i) => ({ address: i.address, options: i.options.map(String) })));
	const applied = E.applyAudioProbe(state.value, device, settings, inputs, result.streams, props.skills);
	state.value = applied.state;
	audioProbe.value = { status: applied.status, probing: false, log: result.log };
}

function onSource(type: 'video' | 'audio', source: { type: string; settings: SourceSettings }) {
	const current = state.value.sources[type];

	if (source.type !== current.type) {
		state.value = E.changeSource(state.value, type, source.type);
	}

	// Edited settings have not been probed yet.
	state.value = { ...state.value, sources: { ...state.value.sources, [type]: { ...state.value.sources[type], settings: source.settings } } };
	if (type === 'video') {
		videoProbe.value = { ...videoProbe.value, status: 'none' };
	} else {
		audioProbe.value = { ...audioProbe.value, status: source.type === 'noaudio' || source.type === 'videoaudio' ? 'success' : 'none' };
	}
}

function setTrack(type: 'video' | 'audio', track: MetadataProfileTrack) {
	state.value = { ...state.value, profile: { ...state.value.profile, [type]: track } };
}

async function refreshSkills() {
	refreshing.value = true;
	try {
		await props.refresh();
	} finally {
		refreshing.value = false;
	}
}

function showLog(log: string[]) {
	logText.value = log.join('\n');
	logOpen.value = true;
}

function finish() {
	const result = E.finish(state.value);
	emit('done', result.sources, result.profile);
}

const streamLabel = (s: MetadataSource['streams'][number]) =>
	s.type === 'video'
		? `Stream ${s.stream}: ${s.codec.toUpperCase()} ${s.width}x${s.height} ${s.pix_fmt ?? ''}`
		: `Stream ${s.stream}: ${s.codec.toUpperCase()} ${s.layout} ${s.sampling_hz}Hz`;

const streamItems = (source: MetadataSource, type: 'video' | 'audio') =>
	source.streams.filter((s) => s.type === type).map((s) => ({ label: streamLabel(s), value: s.stream }));
</script>

<template>
	<div class="relative space-y-6">
		<!-- video -->
		<template v-if="step === 'video'">
			<h3 class="font-medium text-highlighted">{{ $t('Video settings') }}</h3>

			<SourceSelect
				type="video"
				:source="state.sources.video"
				:config="config"
				:skills="skills"
				:on-store="store"
				@update:source="(s) => onSource('video', s)"
				@probe="probeVideo"
				@refresh="refreshSkills"
			/>

			<div v-if="videoProbe.probing" class="flex items-center gap-2 text-sm text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
				{{ $t('Please wait. Probe stream data ...') }}
			</div>

			<UAlert
				v-else-if="videoProbe.status === 'error'"
				color="error"
				variant="subtle"
				icon="i-lucide-triangle-alert"
				:title="$t('Failed to probe the source.')"
				:actions="[{ label: $t('Show probe details'), onClick: () => showLog(videoProbe.log) }]"
			/>
			<UAlert
				v-else-if="videoProbe.status === 'nostream'"
				color="error"
				variant="subtle"
				icon="i-lucide-triangle-alert"
				:title="$t('The source doesn\'t provide any video streams.')"
				:actions="[{ label: $t('Show probe details'), onClick: () => showLog(videoProbe.log) }]"
			/>

			<template v-else-if="videoProbe.status === 'success'">
				<UFormField :label="$t('Stream')">
					<USelect
						:model-value="state.profile.video.stream"
						:items="streamItems(state.sources.video, 'video')"
						class="w-full"
						@update:model-value="(v) => (state = E.selectStream(state, 'video', Number(v)))"
					/>
				</UFormField>

				<CoderEncodingSelect
					type="video"
					:streams="state.sources.video.streams"
					:profile="state.profile.video"
					:codecs="videoCodecs"
					:skills="skills"
					@update:profile="(track) => setTrack('video', track)"
				/>

				<CoderFilterSelect
					v-if="!['copy', 'none'].includes(state.profile.video.encoder.coder)"
					type="video"
					:profile="state.profile.video"
					:available-filters="skills.filter"
					@update:profile="(track) => setTrack('video', track)"
				/>

				<div v-if="videoProbe.log.length !== 0" class="flex justify-end">
					<UButton color="neutral" variant="link" :label="$t('Show probe details')" @click="showLog(videoProbe.log)" />
				</div>
			</template>

			<div class="flex justify-between">
				<UButton color="neutral" variant="outline" :label="$t('Abort')" @click="emit('abort')" />
				<UButton :disabled="videoProbe.status !== 'success'" :label="$t('Next: Audio')" @click="step = 'audio'" />
			</div>
		</template>

		<!-- audio -->
		<template v-else>
			<h3 class="font-medium text-highlighted">{{ $t('Audio settings') }}</h3>

			<SourceSelect
				type="audio"
				:source="state.sources.audio"
				:config="config"
				:skills="skills"
				:available-sources="audioSources"
				:on-store="store"
				@update:source="(s) => onSource('audio', s)"
				@probe="probeAudio"
				@refresh="refreshSkills"
			/>

			<!-- audio taken from the video source -->
			<template v-if="audioFromVideo">
				<UFormField :label="$t('Stream')">
					<USelect
						:model-value="state.profile.custom.stream"
						:items="streamItems(state.sources.video, 'audio')"
						class="w-full"
						@update:model-value="(v) => (state = E.selectStream(state, 'audio', Number(v), true))"
					/>
				</UFormField>

				<CoderEncodingSelect
					type="audio"
					:streams="state.sources.video.streams"
					:profile="state.profile.audio"
					:codecs="audioCodecs"
					:skills="skills"
					@update:profile="(track) => setTrack('audio', track)"
				/>
				<CoderFilterSelect
					v-if="!['copy', 'none'].includes(state.profile.audio.encoder.coder)"
					type="audio"
					:profile="state.profile.audio"
					:available-filters="skills.filter"
					@update:profile="(track) => setTrack('audio', track)"
				/>
			</template>

			<!-- a separate audio source -->
			<template v-else-if="state.profile.custom.selected">
				<div v-if="audioProbe.probing" class="flex items-center gap-2 text-sm text-muted">
					<UIcon name="i-lucide-loader-circle" class="size-4 animate-spin" />
					{{ $t('Please wait. Probe stream data ...') }}
				</div>

				<UAlert
					v-else-if="audioProbe.status === 'error'"
					color="error"
					variant="subtle"
					icon="i-lucide-triangle-alert"
					:title="$t('Failed to probe the source.')"
					:actions="[{ label: $t('Show probe details'), onClick: () => showLog(audioProbe.log) }]"
				/>
				<UAlert
					v-else-if="audioProbe.status === 'nostream'"
					color="error"
					variant="subtle"
					icon="i-lucide-triangle-alert"
					:title="$t('The source doesn\'t provide any audio streams.')"
					:actions="[{ label: $t('Show probe details'), onClick: () => showLog(audioProbe.log) }]"
				/>

				<template v-else-if="audioProbe.status === 'success'">
					<UFormField :label="$t('Stream')">
						<USelect
							:model-value="state.profile.audio.stream"
							:items="streamItems(state.sources.audio, 'audio')"
							class="w-full"
							@update:model-value="(v) => (state = E.selectStream(state, 'audio', Number(v)))"
						/>
					</UFormField>

					<CoderEncodingSelect
						type="audio"
						:streams="state.sources.audio.streams"
						:profile="state.profile.audio"
						:codecs="audioCodecs"
						:skills="skills"
						@update:profile="(track) => setTrack('audio', track)"
					/>
					<CoderFilterSelect
						v-if="!['copy', 'none'].includes(state.profile.audio.encoder.coder)"
						type="audio"
						:profile="state.profile.audio"
						:available-filters="skills.filter"
						@update:profile="(track) => setTrack('audio', track)"
					/>
				</template>
			</template>

			<div class="flex justify-between">
				<UButton color="neutral" variant="outline" :label="$t('Back')" @click="step = 'video'" />
				<UButton :disabled="state.profile.custom.selected && audioProbe.status !== 'success'" :label="$t('Finish')" @click="finish" />
			</div>
		</template>

		<div v-if="refreshing" class="absolute inset-0 flex items-center justify-center bg-default/70">
			<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
		</div>

		<UModal v-model:open="logOpen" :title="$t('Probe details')" :ui="{ content: 'sm:max-w-3xl' }">
			<template #body>
				<pre class="max-h-[60vh] overflow-auto rounded-md bg-elevated p-3 font-mono text-xs">{{ logText }}</pre>
			</template>
		</UModal>
	</div>
</template>
