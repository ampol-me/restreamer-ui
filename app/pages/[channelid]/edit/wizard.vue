<script setup lang="ts">
import type { Component } from 'vue';

import type { CoreActiveConfig, CoreSkills } from '#shared/core/types';
import { saveIngest } from '#shared/ingest/save';
import * as W from '#shared/ingest/wizard';
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

// Guided setup of a channel: source type → source settings → probe → video → audio → metadata → license.
type Step = 'type' | 'video-settings' | 'video-probe' | 'video-result' | 'audio-settings' | 'audio-probe' | 'meta' | 'license' | 'saving' | 'error' | 'abort';

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

// Step 1: source type
const availableSources = computed(() => {
	if (!skills.value) return [];
	const known = knownSources(skills.value);
	return WizardSources.List().filter((s) => known.includes(s.id) && s.id in forms);
});

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

function onSourceChange(settings: SourceSettings, inputs: SourceInput[], isReady: boolean) {
	if (!wizardSource.value) return;
	sources.value = {
		...sources.value,
		video: {
			...sources.value.video,
			type: wizardSource.value.type,
			settings,
			inputs: inputs.map((i) => ({ address: i.address, options: i.options.map(String) })),
		},
	};
	sourceReady.value = isReady;
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
	step.value = (await probe('video')) ? 'video-result' : 'video-settings';
}

function backToType() {
	probeStatus.value = 'none';
	sources.value = W.emptySources();
	step.value = 'type';
}

// Step 4: video result
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
	const items: { label: string; value: W.AudioChoice }[] = [];
	if (audioStreams.value.length !== 0) items.push({ label: t('Audio from device'), value: 'video' });
	if (alsaDevices.value.length !== 0) items.push({ label: `${t('Audio from device')} (ALSA)`, value: 'alsa' });
	items.push({ label: t('Silence Audio'), value: 'silence' }, { label: t('No audio'), value: 'none' });
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
	toast.add({ title: t('Main channel saved'), color: 'success' });
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
			return t('Audio setup');
		case 'meta':
			return t('Metadata');
		case 'license':
			return t('License');
		case 'error':
			return t('Error');
		case 'abort':
			return t('Abort');
		default:
			return t('Video setup');
	}
});
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
						:label="$t('Abort')"
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
				<!-- 1. source type -->
				<template v-if="step === 'type'">
					<p class="text-sm text-muted">
						{{
							$t(
								'Select whether you pull the stream from a network source (such as a network camera) or the internal RTMP server (e.g., OBS streams to the Restreamer).',
							)
						}}
					</p>
					<div class="grid grid-cols-2 gap-3">
						<UButton
							v-for="source in availableSources"
							:key="source.id"
							color="neutral"
							variant="subtle"
							size="xl"
							class="flex-col gap-2 py-6"
							:icon="source.icon"
							:label="$t(source.name)"
							@click="chooseType(source.id)"
						/>
					</div>
					<div class="flex justify-end">
						<UButton color="neutral" variant="link" :label="$t('Advanced setup')" :to="`/${channelid}/edit`" />
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
						<component
							:is="sourceForm"
							v-if="sourceForm"
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
						<UButton color="neutral" variant="outline" :label="$t('Back')" @click="step = 'video-result'" />
						<UButton :label="$t('Next')" @click="confirmAudio" />
					</div>
				</template>

				<!-- 6. metadata -->
				<template v-else-if="step === 'meta'">
					<p class="text-sm text-muted">{{ $t('Briefly describe what the audience will see during the live stream.') }}</p>
					<ChannelMetaForm v-model="data.meta" />
					<div class="flex justify-between">
						<UButton color="neutral" variant="outline" :label="$t('Back')" @click="step = 'audio-settings'" />
						<UButton :label="$t('Next')" @click="step = 'license'" />
					</div>
				</template>

				<!-- 7. license -->
				<template v-else-if="step === 'license'">
					<p class="text-sm text-muted">
						{{
							$t(
								'Use your copyright and choose the correct image license. Whether free for all or highly restricted. Briefly discuss what others are allowed to do with your image.',
							)
						}}
					</p>
					<ChannelLicenseForm v-model="data.license" />
					<div class="flex justify-between">
						<UButton color="neutral" variant="outline" :label="$t('Back')" @click="step = 'meta'" />
						<UButton icon="i-lucide-save" :label="$t('Save')" @click="save" />
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
