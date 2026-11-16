<script setup lang="ts">
import * as M from '#shared/metadata';
import type { EgressMetadata, MetadataProfileTrack, MetadataSource } from '#shared/metadata';
import type { Service, ServiceOutput } from '#shared/services/types';
import type { CoreSkills, EgressControl, ServiceSkills } from '#shared/core/types.publication';

// The three tabs of a publication (General, Source & Encoding, Process control), shared by the add and
// the edit page. It owns no state: every change is answered with the complete new settings.
const props = defineProps<{
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the registry hands services out with their settings type erased
	service: Service<any>;
	settings: EgressMetadata;
	// The channel's streams as a single source, see createSourcesFromStreams().
	sources: MetadataSource[];
	// Where a publication may read the channel from: 'hls+memfs' | 'hls+diskfs' | 'rtmp' | 'srt'.
	localSources: string[];
	skills: CoreSkills;
	serviceSkills: ServiceSkills;
	// Channel metadata: { name, description, license }
	metadata: Record<string, unknown>;
	mode: 'add' | 'edit';
}>();

const emit = defineEmits<{
	// `automatic` is true for changes the form made by itself (filling in defaults), not the user.
	'update:settings': [settings: EgressMetadata, automatic: boolean];
}>();

const { t } = useI18n();

const tab = ref('general');
const tabs = computed(() => [
	{ label: t('General'), value: 'general', slot: 'general' as const },
	{ label: t('Source & Encoding'), value: 'encoding', slot: 'encoding' as const },
	{ label: t('Process control'), value: 'process', slot: 'process' as const },
]);

// Services whose outputs depend on the encoded streams (legacy: the ones exporting createOutputs()).
// Their outputs are rebuilt when the encoding changes; all others keep what their form produced last.
const STREAM_DEPENDENT_SERVICES = ['icecast'];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const streams = computed(() => props.sources[0]?.streams ?? []);
const profile = computed(() => props.settings.profiles[0]);

// Several forms report their defaults in the same tick they appear, before the parent has handed the
// previous change back down. Each change therefore builds on the last one sent, not on the props.
let latest = props.settings;
watch(
	() => props.settings,
	(settings) => {
		latest = settings;
	},
	{ flush: 'sync' },
);

function send(patch: Partial<EgressMetadata>, automatic: boolean) {
	latest = { ...latest, ...patch };
	emit('update:settings', latest, automatic);
}

function onName(name: string) {
	send({ name }, false);
}

function onService(outputs: (ServiceOutput | null)[], settings: Record<string, unknown>) {
	// A service answers null for an output it cannot build yet; such a publication has no output.
	const complete = outputs.filter((output): output is ServiceOutput => output !== null);
	send({ outputs: complete as EgressMetadata['outputs'], settings }, false);
}

function onEncoding(type: 'video' | 'audio', track: MetadataProfileTrack, automatic: boolean) {
	const profiles = clone(latest.profiles);
	const first = profiles[0];
	if (!first) {
		return;
	}

	first[type].encoder = track.encoder;
	first[type].decoder = track.decoder;

	const outputStreams = M.createOutputStreams(clone(props.sources), profiles, false);

	let outputs = latest.outputs;
	if (STREAM_DEPENDENT_SERVICES.includes(props.service.id)) {
		const settings = props.service.init(clone(latest.settings), props.metadata);
		const created = props.service.createOutput(settings, { skills: props.serviceSkills, metadata: props.metadata, streams: outputStreams });
		outputs = created.filter((output): output is ServiceOutput => output !== null) as EgressMetadata['outputs'];
	}

	send({ profiles, streams: outputStreams, outputs }, automatic);
}

function onFilter(type: 'video' | 'audio', track: MetadataProfileTrack, automatic: boolean) {
	const profiles = clone(latest.profiles);
	const first = profiles[0];
	if (!first) {
		return;
	}

	first[type].filter = track.filter;

	send({ profiles }, automatic);
}

function onControl(control: EgressControl, automatic: boolean) {
	send({ control }, automatic);
}
</script>

<template>
	<div class="space-y-6">
		<header class="flex items-center gap-4 border-b border-default pb-4">
			<PublicationServiceIcon :icon="service.icon" class="size-14 shrink-0" />
			<div class="min-w-0">
				<h2 class="truncate text-xl font-semibold text-highlighted">{{ service.name }}</h2>
				<p class="text-sm text-muted">v{{ service.version }}</p>
			</div>
		</header>

		<UTabs v-model="tab" :items="tabs" variant="link" class="w-full">
			<template #general>
				<PublicationServiceForm
					class="pt-4"
					:service="service"
					:settings="settings.settings"
					:skills="serviceSkills"
					:metadata="metadata"
					:streams="settings.streams"
					@change="onService"
				>
					<UFormField :label="$t('Service name')">
						<UInput :model-value="settings.name" class="w-full" @update:model-value="(v) => onName(String(v ?? ''))" />
					</UFormField>
				</PublicationServiceForm>
			</template>

			<template #encoding>
				<div v-if="profile" class="space-y-8 pt-4">
					<section class="space-y-3">
						<h3 class="font-medium text-highlighted">{{ $t('Source') }}</h3>
						<p class="text-sm text-muted">{{ $t('Select RTMP or SRT (if enabled) for less latency.') }}</p>
						<PublicationProcessControl section="source" :control="settings.control" :sources="localSources" @update:control="onControl" />
					</section>

					<section class="space-y-4">
						<h3 class="font-medium text-highlighted">{{ $t('Encoding') }}</h3>
						<p class="text-sm text-muted">
							{{
								mode === 'add'
									? $t('Please use "Passthrough (copy)" if possible. Encoding requires additional CPU/GPU resources.')
									: $t('Passthrough (copy) should only be disabled if necessary. Each encoding requires additional CPU/GPU resources.')
							}}
						</p>

						<h4 class="text-sm font-medium text-highlighted">{{ mode === 'add' ? $t('Video') : $t('Video settings') }}</h4>
						<CoderEncodingSelect
							type="video"
							:streams="streams"
							:profile="profile.video"
							:codecs="serviceSkills.codecs.video"
							:skills="skills"
							@update:profile="(track: MetadataProfileTrack, automatic: boolean) => onEncoding('video', track, automatic)"
						/>
						<CoderFilterSelect
							v-if="profile.video.encoder.coder !== 'copy'"
							type="video"
							:profile="profile.video"
							:available-filters="skills.filter"
							@update:profile="(track: MetadataProfileTrack, automatic: boolean) => onFilter('video', track, automatic)"
						/>

						<h4 class="text-sm font-medium text-highlighted">{{ mode === 'add' ? $t('Audio') : $t('Audio settings') }}</h4>
						<CoderEncodingSelect
							type="audio"
							:streams="streams"
							:profile="profile.audio"
							:codecs="serviceSkills.codecs.audio"
							:skills="skills"
							@update:profile="(track: MetadataProfileTrack, automatic: boolean) => onEncoding('audio', track, automatic)"
						/>
						<CoderFilterSelect
							v-if="profile.audio.encoder.coder !== 'copy'"
							type="audio"
							:profile="profile.audio"
							:available-filters="skills.filter"
							@update:profile="(track: MetadataProfileTrack, automatic: boolean) => onFilter('audio', track, automatic)"
						/>
					</section>
				</div>
			</template>

			<template #process>
				<div class="space-y-8 pt-4">
					<PublicationProcessControl section="process" :control="settings.control" @update:control="onControl" />
					<slot name="process" />
				</div>
			</template>
		</UTabs>

		<p class="border-t border-default pt-4 text-sm text-muted">
			{{ $t('Maintainer:') }}
			<ULink :to="service.author.maintainer.link" target="_blank" class="text-primary underline">{{ service.author.maintainer.name }}</ULink>
		</p>
	</div>
</template>
