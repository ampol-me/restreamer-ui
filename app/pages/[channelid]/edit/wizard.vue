<script setup lang="ts">
import type { Component } from 'vue';

import type { CoreActiveConfig, CoreSkills } from '#shared/core/types';
import { saveIngest } from '#shared/ingest/save';
import * as W from '#shared/ingest/wizard';
import * as Playlist from '#shared/sources/playlist';
import { getDefaultIngestMetadata, initProfile, type IngestMetadata, type MetadataProfile, type MetadataStream } from '#shared/metadata';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';
import WizardSources, { knownSources } from '#shared/sources/wizard';
import {
	SourceWizardAVFoundation,
	SourceWizardInternalRTMP,
	SourceWizardInternalSRT,
	SourceWizardNetwork,
	SourceWizardRaspicam,
	SourceWizardV4L,
} from '#components';

// Guided setup of a channel in four stages: source → picture → sound → name. Questions the
// wizard can answer itself are not asked (a compatible video stream is taken as it is), and what
// few people change (author, license) is folded away on the last page.
type Step = 'type' | 'video-settings' | 'video-probe' | 'video-result' | 'audio-settings' | 'audio-probe' | 'meta' | 'saving' | 'error' | 'abort';

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { api, sync } = useRestreamer();

const channelid = computed(() => String(route.params.channelid));

const forms: Record<string, Component> = {
	network: SourceWizardNetwork,
	rtmp: SourceWizardInternalRTMP,
	srt: SourceWizardInternalSRT,
	avfoundation: SourceWizardAVFoundation,
	raspicam: SourceWizardRaspicam,
	video4linux2: SourceWizardV4L,
};

const ready = ref(false);
const step = ref<Step>('type');
const abortFrom = ref<Step>('type');
const skills = ref<CoreSkills | null>(null);
const coreConfig = ref<CoreActiveConfig | null>(null);
const refreshing = ref(false);

const data = ref<IngestMetadata>(getDefaultIngestMetadata());
const sources = ref<W.WizardSources>(W.emptySources());
const profile = ref<MetadataProfile>(initProfile({}));
const sourceid = ref('');
// Whether the source form has enough to probe (legacy `ready`).
const sourceReady = ref(false);
const probeStatus = ref<W.ProbeStatus>('none');

onMounted(async () => {
	const selected = api().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await navigateTo('/', { replace: true });
		return;
	}

	skills.value = api().Skills();
	coreConfig.value = api().ConfigActive();
	data.value.meta.name = api().GetChannel(channelid.value)?.name ?? '';
	ready.value = true;
});

// Step 1: source type, in the words of someone who has a camera or an encoder, not of ffmpeg.
const PLAYLIST = Playlist.id;
const sourceText = computed<Record<string, { title: string; description: string }>>(() => ({
	rtmp: { title: t('Encoder or streaming software'), description: t('OBS, vMix or a hardware encoder sends its picture to this server (RTMP).') },
	network: { title: t('Camera or stream address'), description: t('An IP camera or another stream is fetched from its address (RTSP, RTMP, HLS, SRT).') },
	[PLAYLIST]: { title: t('Video files'), description: t('Upload videos; the channel plays them one after the other like a live signal.') },
	srt: { title: t('Encoder over SRT'), description: t('Like the first option, for encoders that send over SRT (more robust on poor connections).') },
	avfoundation: { title: t('Camera of this Mac'), description: t('A camera or capture device connected to the server (macOS).') },
	raspicam: { title: t('Raspberry Pi camera'), description: t('The camera module of the Raspberry Pi the server runs on.') },
	video4linux2: { title: t('Capture device of the server'), description: t('A USB camera or capture card connected to the server (Linux).') },
}));
// What most people need, in this order; the rest is one click away.
const commonSources = ['rtmp', 'network', PLAYLIST, 'srt'];

const availableSources = computed(() => {
	if (!skills.value) return [];
	const known = knownSources(skills.value);
	const offered = WizardSources.List()
		.filter((s) => known.includes(s.id) && s.id in forms)
		.map((s) => ({ id: s.id, icon: s.icon }));
	if (PLAYLIST in skills.value.sources) offered.push({ id: PLAYLIST, icon: Playlist.icon });
	return offered;
});
const mainSources = computed(() => commonSources.flatMap((id) => availableSources.value.filter((s) => s.id === id)));
const otherSources = computed(() => availableSources.value.filter((s) => !commonSources.includes(s.id)));
const showOther = ref(false);

function chooseType(id: string) {
	sourceid.value = id;
	sourceReady.value = false;
	probeStatus.value = 'none';
	step.value = 'video-settings';
}

// Step 2: source settings
const wizardSource = computed(() => WizardSources.Get(sourceid.value));
const sourceForm = computed(() => forms[sourceid.value]);
const knownDevices = computed(() => (wizardSource.value ? ((skills.value?.sources[wizardSource.value.type] ?? []) as SourceDevice[]) : []));
const sourceConfig = computed(() =>
	wizardSource.value ? ((coreConfig.value?.source[wizardSource.value.type] ?? null) as Record<string, unknown> | null) : null,
);

function setVideoSource(type: string, settings: SourceSettings, inputs: SourceInput[], isReady: boolean) {
	sources.value = {
		...sources.value,
		video: {
			...sources.value.video,
			type,
			settings,
			inputs: inputs.map((i) => ({ address: i.address, options: i.options.map(String) })),
		},
	};
	sourceReady.value = isReady;
}

function onSourceChange(settings: SourceSettings, inputs: SourceInput[], isReady: boolean) {
	if (wizardSource.value) setVideoSource(wizardSource.value.type, settings, inputs, isReady);
}

// The playlist is the one source that has no wizard form of its own: it uses the editor's.
function onPlaylistChange(settings: SourceSettings) {
	setVideoSource(PLAYLIST, settings, Playlist.createInputs(settings), Playlist.initSettings(settings).items.length > 0);
}

async function refreshSkills() {
	refreshing.value = true;
	try {
		await api().RefreshSkills();
		skills.value = api().Skills();
	} finally {
		refreshing.value = false;
	}
}

async function probe(type: 'video' | 'audio'): Promise<boolean> {
	if (!skills.value) return false;

	const source = sources.value[type];
	const [result, error] = await api().Probe(channelid.value, source.inputs);
	const streams: MetadataStream[] = error === null && result ? result.streams : [];

	const applied = W.applyProbe(type, streams, profile.value, skills.value);
	profile.value = applied.profile;
	probeStatus.value = applied.status;
	sources.value = { ...sources.value, [type]: { ...source, streams } };

	return applied.status === 'success';
}

async function probeVideo() {
	step.value = 'video-probe';
	if (!(await probe('video'))) {
		step.value = 'video-settings';
		return;
	}

	// One video stream that can be passed on as it is: there is nothing to choose.
	videoAsked.value = !(videoCompatible.value && videoStreams.value.length === 1);
	if (videoAsked.value) {
		step.value = 'video-result';
	} else {
		confirmVideo();
	}
}

function backToType() {
	probeStatus.value = 'none';
	sources.value = W.emptySources();
	step.value = 'type';
}

// Step 4: video result
// Whether the video page was shown (and "Back" from the sound page returns to it).
const videoAsked = ref(true);
const videoStreams = computed(() => sources.value.video.streams.filter((s) => s.type === 'video'));
const videoStream = computed(() => sources.value.video.streams[profile.value.video.stream]);
const videoCompatible = computed(() => W.isVideoCompatible(videoStream.value));
const videoChoices = computed(() =>
	videoStream.value && skills.value ? W.videoCoderChoices(videoStream.value, skills.value) : { encoders: [], decoders: [] },
);

function setVideo(values: { stream?: number; encoder?: string; decoder?: string }) {
	const next: MetadataProfile = JSON.parse(JSON.stringify(profile.value));
	if (values.stream !== undefined) next.video.stream = values.stream;
	if (values.encoder !== undefined) next.video.encoder.coder = values.encoder;
	if (values.decoder !== undefined) next.video.decoder.coder = values.decoder;
	profile.value = next;
}

function confirmVideo() {
	if (!skills.value) return;
	const result = W.confirmVideo(sources.value, profile.value, skills.value);
	sources.value = result.sources;
	profile.value = result.profile;
	probeStatus.value = 'none';
	step.value = 'audio-settings';
}

// Step 5: audio
const audioStreams = computed(() => sources.value.video.streams.filter((s) => s.type === 'audio'));
const alsaDevices = computed(() => (skills.value ? W.alsaDevices(sources.value, skills.value) : []));
const audioChoice = computed(() => W.audioChoice(sources.value, profile.value));

const audioItems = computed(() => {
	const items: { label: string; description: string; value: W.AudioChoice }[] = [];
	if (audioStreams.value.length !== 0)
		items.push({ label: t('Sound of the source'), description: t('The sound that comes with the picture.'), value: 'video' });
	if (alsaDevices.value.length !== 0) {
		items.push({ label: t('Sound card of the server'), description: t('A microphone or line input connected to the server (ALSA).'), value: 'alsa' });
	}
	items.push(
		{ label: t('Silence'), description: t('A silent sound track. YouTube, Facebook and others refuse streams without sound.'), value: 'silence' },
		{ label: t('No sound track'), description: t('Picture only.'), value: 'none' },
	);
	return items;
});

function chooseAudio(choice: W.AudioChoice) {
	if (!skills.value) return;
	const result = W.chooseAudio(choice, sources.value, profile.value, skills.value);
	sources.value = result.sources;
	profile.value = result.profile;
}

function setAudioStream(stream: number) {
	const next: MetadataProfile = JSON.parse(JSON.stringify(profile.value));
	next.audio.stream = stream;
	profile.value = next;
}

async function confirmAudio() {
	if (!skills.value) return;

	// A separate audio source (ALSA, silence) is probed like the video source was.
	if (profile.value.audio.source === 1) {
		step.value = 'audio-probe';
		if (!(await probe('audio'))) {
			step.value = 'audio-settings';
			return;
		}
	}

	profile.value = W.confirmAudio(sources.value, profile.value, skills.value);
	step.value = 'meta';
}

// Last step: save
async function save() {
	step.value = 'saving';

	const metadata = W.buildMetadata(data.value, sources.value, profile.value);
	const result = await saveIngest(api(), channelid.value, metadata);

	if (!result.ok) {
		const problem = result.problems[0];
		toast.add({
			title: problem?.step === 'ingest' ? problem.message : t('The input profile is not complete. Please define a video and audio source.'),
			color: 'error',
		});
		step.value = 'error';
		return;
	}

	sync();
	toast.add({ title: t('Channel saved'), color: 'success' });
	await navigateTo(`/${channelid.value}`);
}

// Abort
const channelCount = computed(() => api().ListChannels().length);
// A channel that already works can simply be left; a new one has nothing to go back to.
const hasIngest = computed(() => api().GetChannel(channelid.value)?.available === true);

function askAbort() {
	abortFrom.value = step.value;
	step.value = 'abort';
}

async function abort() {
	if (hasIngest.value) {
		await navigateTo(`/${channelid.value}`);
		return;
	}

	await api().DeleteChannel(channelid.value);
	sync();
	await navigateTo('/');
}

const stepTitle = computed(() => {
	switch (step.value) {
		case 'audio-settings':
		case 'audio-probe':
			return t('Which sound goes with it?');
		case 'meta':
			return t('Name the channel');
		case 'error':
			return t('Error');
		case 'abort':
			return t('Abort');
		case 'type':
			return t('Where does the picture come from?');
		default:
			return t('Set up the source');
	}
});

// Where the user is, for the progress line.
const stages = computed(() => [t('Source'), t('Picture'), t('Sound'), t('Name')]);
const stage = computed(() => {
	switch (step.value === 'abort' ? abortFrom.value : step.value) {
		case 'type':
			return 0;
		case 'video-settings':
		case 'video-probe':
		case 'video-result':
			return 1;
		case 'audio-settings':
		case 'audio-probe':
			return 2;
		default:
			return 3;
	}
});

const setMeta = (values: Partial<IngestMetadata['meta']>) => (data.value.meta = { ...data.value.meta, ...values });
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="stepTitle">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton
						v-if="step !== 'abort' && step !== 'saving'"
						color="neutral"
						variant="ghost"
						icon="i-lucide-x"
						:label="$t('Cancel')"
						@click="askAbort"
					/>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<div v-else class="mx-auto w-full max-w-xl space-y-6">
				<ol class="flex items-center gap-2" :aria-label="$t('Setup progress')">
					<li
						v-for="(name, index) in stages"
						:key="name"
						class="flex min-w-0 flex-1 items-center gap-2 border-t-2 pt-2 text-sm"
						:class="index <= stage ? 'border-primary' : 'border-default'"
						:aria-current="index === stage ? 'step' : undefined"
					>
						<span class="font-mono text-muted">{{ index + 1 }}</span>
						<span class="truncate" :class="index === stage ? 'font-semibold text-highlighted' : 'text-muted'">{{ name }}</span>
						<UIcon v-if="index < stage" name="i-lucide-check" class="size-4 shrink-0 text-success" :aria-label="$t('Done')" />
					</li>
				</ol>

				<!-- 1. source type -->
				<template v-if="step === 'type'">
					<div class="space-y-2">
						<button
							v-for="source in showOther ? [...mainSources, ...otherSources] : mainSources"
							:key="source.id"
							type="button"
							class="flex w-full items-center gap-4 rounded-lg border border-default bg-elevated p-4 text-left hover:border-accented"
							@click="chooseType(source.id)"
						>
							<UIcon :name="source.icon" class="size-6 shrink-0 text-primary" />
							<span class="min-w-0 flex-1">
								<span class="block font-semibold text-highlighted">{{ sourceText[source.id]?.title ?? source.id }}</span>
								<span class="block text-sm text-muted">{{ sourceText[source.id]?.description }}</span>
							</span>
							<UIcon name="i-lucide-chevron-right" class="size-5 shrink-0 text-muted" />
						</button>
					</div>
					<div class="flex flex-wrap justify-between gap-2">
						<UButton
							v-if="otherSources.length > 0"
							color="neutral"
							variant="link"
							:icon="showOther ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
							:label="showOther ? $t('Fewer sources') : $t('More sources')"
							:aria-expanded="showOther"
							@click="showOther = !showOther"
						/>
						<UButton color="neutral" variant="link" :label="$t('Set everything up by hand')" :to="`/${channelid}/edit`" class="ml-auto" />
					</div>
				</template>

				<!-- 2. source settings -->
				<template v-else-if="step === 'video-settings'">
					<UAlert
						v-if="probeStatus === 'error'"
						color="error"
						variant="subtle"
						icon="i-lucide-triangle-alert"
						:title="
							sourceid === 'rtmp' || sourceid === 'hls'
								? $t('No live stream was detected. Please check the software that sends the stream.')
								: $t('Failed to verify the source. Please check the address.')
						"
					/>
					<UAlert
						v-else-if="probeStatus === 'nostream'"
						color="error"
						variant="subtle"
						icon="i-lucide-triangle-alert"
						:title="$t('The source doesn\'t provide any video streams. Please check the device.')"
					/>
					<UAlert
						v-else-if="probeStatus === 'nocoder'"
						color="error"
						variant="subtle"
						icon="i-lucide-triangle-alert"
						:title="$t('The source doesn\'t provide any compatible video streams.')"
						:actions="[{ label: $t('Requirements'), to: 'https://github.com/datarhei/restreamer', target: '_blank' }]"
					/>

					<div class="relative">
						<SourcePlaylist v-if="sourceid === PLAYLIST" :settings="sources.video.settings" hide-probe @update:settings="onPlaylistChange" />
						<component
							:is="sourceForm"
							v-else-if="sourceForm"
							:known-devices="knownDevices"
							:config="sourceConfig"
							:settings="sources.video.settings"
							:skills="skills"
							@change="onSourceChange"
							@refresh="refreshSkills"
						/>
						<div v-if="refreshing" class="absolute inset-0 flex items-center justify-center bg-default/70">
							<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
						</div>
					</div>

					<div class="flex justify-between">
						<UButton color="neutral" variant="outline" :label="$t('Back')" @click="backToType" />
						<UButton :disabled="!sourceReady" :label="$t('Next')" @click="probeVideo" />
					</div>
				</template>

				<!-- 3. probing -->
				<div v-else-if="step === 'video-probe' || step === 'audio-probe'" class="flex flex-col items-center gap-3 py-16 text-muted">
					<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
					<p>{{ $t('Please wait. Probe stream data ...') }}</p>
				</div>

				<!-- 4. video result -->
				<template v-else-if="step === 'video-result'">
					<UFormField
						:label="$t('Profile')"
						:help="videoCompatible ? $t('The video source is compatible. Select the desired resolution:') : undefined"
					>
						<USelect
							:model-value="profile.video.stream"
							:items="videoStreams.map((s) => ({ label: `${s.width}x${s.height}, ${s.codec.toUpperCase()}`, value: s.stream }))"
							class="w-full"
							@update:model-value="(v) => setVideo({ stream: Number(v) })"
						/>
					</UFormField>

					<template v-if="!videoCompatible">
						<UAlert
							v-if="videoChoices.encoders.length === 0"
							color="error"
							variant="subtle"
							icon="i-lucide-triangle-alert"
							:title="$t('Your stream needs to be encoded, but there\'s no suitable encoder available.')"
						/>
						<template v-else>
							<p class="text-sm text-muted">{{ $t('Your stream needs to be encoded. Choose the desired encoder:') }}</p>
							<UFormField v-if="videoChoices.decoders.length >= 2" :label="$t('Decoder')">
								<USelect
									:model-value="profile.video.decoder.coder"
									:items="videoChoices.decoders.map((c) => ({ label: c.name, value: c.coder }))"
									class="w-full"
									@update:model-value="(v) => setVideo({ decoder: String(v) })"
								/>
							</UFormField>
							<UFormField :label="$t('Encoder')">
								<USelect
									:model-value="profile.video.encoder.coder"
									:items="videoChoices.encoders.map((c) => ({ label: c.name, value: c.coder }))"
									class="w-full"
									@update:model-value="(v) => setVideo({ encoder: String(v) })"
								/>
							</UFormField>
						</template>
					</template>

					<div class="flex justify-between">
						<UButton color="neutral" variant="outline" :label="$t('Back')" @click="step = 'video-settings'" />
						<UButton :disabled="!videoCompatible && videoChoices.encoders.length === 0" :label="$t('Next')" @click="confirmVideo" />
					</div>
				</template>

				<!-- 5. audio -->
				<template v-else-if="step === 'audio-settings'">
					<UAlert
						v-if="probeStatus === 'error'"
						color="error"
						variant="subtle"
						icon="i-lucide-triangle-alert"
						:title="$t('Failed to verify the source. Please check the address.')"
					/>
					<UAlert
						v-else-if="probeStatus === 'nostream'"
						color="error"
						variant="subtle"
						icon="i-lucide-triangle-alert"
						:title="$t('The source doesn\'t provide any audio streams.')"
					/>
					<UAlert
						v-else-if="probeStatus === 'nocoder'"
						color="error"
						variant="subtle"
						icon="i-lucide-triangle-alert"
						:title="$t('The source doesn\'t provide any compatible audio streams.')"
					/>

					<p v-if="audioStreams.length === 0" class="text-sm text-muted">
						{{
							$t(
								"The video source doesn't provide any compatible audio stream. Silence audio is recommended. Services e.g. YouTube, Facebook & Co. require an audio channel.",
							)
						}}
					</p>

					<URadioGroup :model-value="audioChoice" :items="audioItems" @update:model-value="(v) => chooseAudio(v as W.AudioChoice)" />

					<UFormField v-if="audioChoice === 'video'" :label="$t('Stream')">
						<USelect
							:model-value="profile.audio.stream"
							:items="audioStreams.map((s) => ({ label: `${s.codec.toUpperCase()} ${s.layout} ${s.sampling_hz}Hz`, value: s.stream }))"
							class="w-full"
							@update:model-value="(v) => setAudioStream(Number(v))"
						/>
					</UFormField>

					<UFormField v-if="audioChoice === 'alsa'" :label="$t('Device')">
						<USelect
							:model-value="sources.audio.settings.address"
							:items="alsaDevices.map((d) => ({ label: `${d.name} (${d.id})`, value: d.id }))"
							class="w-full"
							@update:model-value="(v) => (sources = W.chooseAlsaDevice(String(v), sources))"
						/>
					</UFormField>

					<div class="flex justify-between">
						<UButton color="neutral" variant="outline" :label="$t('Back')" @click="step = videoAsked ? 'video-result' : 'video-settings'" />
						<UButton :label="$t('Next')" @click="confirmAudio" />
					</div>
				</template>

				<!-- 6. name; author and license folded away -->
				<template v-else-if="step === 'meta'">
					<p class="text-sm text-muted">{{ $t('Give the channel a name. Viewers see it above the player.') }}</p>
					<UFormField :label="$t('Name')">
						<UInput
							:model-value="data.meta.name"
							class="w-full"
							maxlength="200"
							autofocus
							@update:model-value="(v) => setMeta({ name: String(v) })"
						/>
					</UFormField>
					<UFormField :label="$t('Description')" :hint="$t('Optional')">
						<UTextarea
							:model-value="data.meta.description"
							:rows="3"
							class="w-full"
							@update:model-value="(v) => setMeta({ description: String(v) })"
						/>
					</UFormField>

					<UCollapsible>
						<UButton
							color="neutral"
							variant="link"
							trailing-icon="i-lucide-chevron-down"
							:label="$t('Author and license (optional)')"
							class="px-0"
						/>
						<template #content>
							<div class="space-y-4 pt-4">
								<UFormField :label="$t('Author')">
									<UInput
										:model-value="data.meta.author.name"
										class="w-full"
										maxlength="200"
										@update:model-value="(v) => setMeta({ author: { ...data.meta.author, name: String(v) } })"
									/>
								</UFormField>
								<ChannelLicenseForm v-model="data.license" />
							</div>
						</template>
					</UCollapsible>

					<div class="flex justify-between">
						<UButton color="neutral" variant="outline" :label="$t('Back')" @click="step = 'audio-settings'" />
						<UButton icon="i-lucide-check" :label="$t('Finish')" @click="save" />
					</div>
				</template>

				<div v-else-if="step === 'saving'" class="flex flex-col items-center gap-3 py-16 text-muted">
					<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
					<p>{{ $t('Please wait. Setting up the stream ...') }}</p>
				</div>

				<template v-else-if="step === 'error'">
					<UAlert color="error" variant="subtle" icon="i-lucide-triangle-alert" :title="$t('There was an error setting up the stream.')" />
					<div class="flex justify-end">
						<UButton :label="$t('Retry')" @click="backToType" />
					</div>
				</template>

				<template v-else-if="step === 'abort'">
					<template v-if="channelCount <= 1 && !hasIngest">
						<p>{{ $t("You can't abort the wizard because at least one input must be defined.") }}</p>
						<div class="flex justify-end">
							<UButton :label="$t('Back')" @click="step = abortFrom" />
						</div>
					</template>
					<template v-else>
						<p>{{ $t('Are you sure you want to abort the wizard?') }}</p>
						<div class="flex justify-end gap-2">
							<UButton color="neutral" variant="outline" :label="$t('No')" @click="step = abortFrom" />
							<UButton color="error" :label="$t('Yes')" @click="abort" />
						</div>
					</template>
				</template>
			</div>
		</template>
	</UDashboardPanel>
</template>
