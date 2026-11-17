<script setup lang="ts">
import * as M from '#shared/metadata';
import type { EgressMetadata, MetadataProfileTrack, MetadataSource } from '#shared/metadata';
import type { Service, ServiceOutput } from '#shared/services/types';
import type { CoreSkills, EgressControl, ServiceSkills } from '#shared/core/types.publication';

// The form of a publication on one page, shared by the add and the edit page: the service's own
// fields first, encoding and process control folded away. The `status` slot (edit page: state
// and start/stop) sits at the top. It owns no state: every change is answered with the complete new settings.
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

// Passing the stream on unchanged with the default process settings fits almost every case: what
// changes that is folded away.
const advanced = computed(() => [
	{ label: t('Source and encoding'), icon: 'i-lucide-sliders-horizontal', value: 'encoding', slot: 'encoding' as const },
	{ label: t('Start, stop and reconnect'), icon: 'i-lucide-timer-reset', value: 'process', slot: 'process' as const },
]);
const openSections = ref<string[]>([]);

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
	<div class="space-y-8">
		<header class="flex items-center gap-4">
			<PublicationServiceIcon :icon="service.icon" class="size-12 shrink-0" />
			<h2 class="min-w-0 truncate text-xl leading-[30px] font-semibold text-highlighted">{{ service.name }}</h2>
		</header>

		<slot name="status" />

		<PublicationServiceForm
			:service="service"
			:settings="settings.settings"
			:skills="serviceSkills"
			:metadata="metadata"
			:streams="settings.streams"
			@change="onService"
		>
			<UFormField :label="$t('Name of this publication')" :help="$t('Only shown here, to tell your publications apart.')">
				<UInput :model-value="settings.name" class="w-full" @update:model-value="(v) => onName(String(v ?? ''))" />
			</UFormField>
		</PublicationServiceForm>

		<section class="space-y-2">
			<h3 class="ph-label text-muted">{{ $t('Advanced') }}</h3>
			<UAccordion v-model="openSections" type="multiple" :items="advanced" :unmount-on-hide="false">
				<template #encoding>
					<div v-if="profile" class="space-y-8 pb-4">
						<section class="space-y-3">
							<h4 class="font-semibold text-highlighted">{{ $t('Source') }}</h4>
							<p class="text-sm text-muted">{{ $t('Select RTMP or SRT (if enabled) for less latency.') }}</p>
							<PublicationProcessControl section="source" :control="settings.control" :sources="localSources" @update:control="onControl" />
						</section>

						<section class="space-y-4">
							<h4 class="font-semibold text-highlighted">{{ $t('Encoding') }}</h4>
							<p class="text-sm text-muted">
								{{ $t('Keep "Passthrough (copy)" where possible: the stream is sent as it is. Encoding again needs extra CPU or GPU power.') }}
							</p>

							<h5 class="text-sm font-semibold text-highlighted">{{ $t('Video') }}</h5>
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

							<h5 class="text-sm font-semibold text-highlighted">{{ $t('Audio') }}</h5>
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
					<div class="pb-4">
						<PublicationProcessControl section="process" :control="settings.control" @update:control="onControl" />
					</div>
				</template>
			</UAccordion>
		</section>

		<p class="border-t border-default pt-4 text-sm text-muted">
			{{ $t('Maintainer:') }}
			<ULink :to="service.author.maintainer.link" target="_blank" class="text-primary underline">{{ service.author.maintainer.name }}</ULink>
			· v{{ service.version }}
		</p>
	</div>
</template>
