<script setup lang="ts">
import type { DropdownMenuItem, TabsItem } from '@nuxt/ui';

import { emptyProgress, type CoreActiveConfig, type ProcessProgress } from '#shared/core/types';
import { saveIngest } from '#shared/ingest/save';
import { getDefaultIngestMetadata, type IngestMetadata } from '#shared/metadata';
import { isStudioChannel, studioIngestMetadata } from '#shared/studio/channel';
import { LAYOUTS, type LayoutId } from '#shared/studio/layout';
import { MAX_SCENES, QUALITIES, applyScene, captureScene, sanitizeSetup, setupKey, type QualityId, type Scene, type StudioSetup } from '#shared/studio/setup';
import { StudioError, type StudioFailure, type StudioSource } from '~/composables/useStudioEngine';
import { formatBitrate, formatUptime } from '~/utils/format';
import type { TallyState } from '~/utils/tally';

// Studio: go live from this browser. Cameras, microphones, shared screens, pictures and video
// files are mixed here into one programme, with layouts and graphics, and sent to the channel.
const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { api, sync } = useRestreamer();

const channelid = computed(() => String(route.params.channelid));

// Setup: remembered in this browser, per channel

function storedSetup(): StudioSetup {
	try {
		return sanitizeSetup(JSON.parse(window.localStorage.getItem(setupKey(channelid.value)) ?? 'null'));
	} catch {
		return sanitizeSetup(null);
	}
}

const setup = ref<StudioSetup>(storedSetup());
let storageFull = false;

watch(
	setup,
	(value) => {
		try {
			window.localStorage.setItem(setupKey(channelid.value), JSON.stringify(value));
			storageFull = false;
		} catch {
			// Said once: the Studio works on, it only will not remember.
			if (!storageFull) toast.add({ title: t('This browser has no room left to remember the Studio setup.'), color: 'warning' });
			storageFull = true;
		}
	},
	{ deep: true },
);

const engine = useStudioEngine(setup);
const broadcast = useStudioBroadcast();

onBeforeUnmount(() => engine.dispose());

// The channel and the server

const phase = ref<'loading' | 'no-rtmp' | 'setup' | 'ready'>('loading');
const coreConfig = ref<CoreActiveConfig | null>(null);
const metadata = ref<IngestMetadata>(getDefaultIngestMetadata());
const progress = ref<ProcessProgress>(emptyProgress());
const server = ref<{ ffmpeg: string; live: string[] } | null>(null);
const secure = window.isSecureContext;

async function load() {
	phase.value = 'loading';

	const selected = api().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await navigateTo('/', { replace: true });
		return;
	}

	coreConfig.value = api().ConfigActive();
	metadata.value = { ...getDefaultIngestMetadata(), ...(await api().GetIngestMetadata(channelid.value)) };
	progress.value = await api().GetIngestProgress(channelid.value);
	server.value = await broadcast.status();

	if (!coreConfig.value.source.network.rtmp.enabled) {
		phase.value = 'no-rtmp';
	} else if (!progress.value.valid || !isStudioChannel(metadata.value, coreConfig.value.source.network)) {
		phase.value = 'setup';
	} else {
		phase.value = 'ready';
	}
}

onMounted(async () => {
	await load();
	sync();
});

usePolling(async () => {
	if (phase.value !== 'ready') return;
	progress.value = await api().GetIngestProgress(channelid.value);
	// Another Studio may have put the channel on air, or taken it off.
	if (broadcast.state.value === 'idle') server.value = (await broadcast.status()) ?? server.value;
}, 1000);

const title = computed(() => t('Studio: {channel}', { channel: api().GetChannel(channelid.value)?.name || t('Main channel') }));

// Setting the channel up

const replaceOpen = ref(false);
const settingUp = ref(false);

async function setUpChannel() {
	replaceOpen.value = false;
	settingUp.value = true;
	try {
		const next = studioIngestMetadata(
			progress.value.valid ? metadata.value : null,
			coreConfig.value?.source.network,
			api().Skills(),
			QUALITIES[setup.value.quality],
		);
		const result = await saveIngest(api(), channelid.value, next);
		if (!result.ok) {
			const problem = result.problems[0];
			toast.add({
				title: t('The channel could not be set up for the Studio.'),
				description: problem && 'message' in problem ? problem.message : undefined,
				color: 'error',
			});
			return;
		}
		toast.add({ title: t('The channel is set up for the Studio.'), color: 'success' });
		// The client answers a repeated read from its memory for a second: wait that out, or
		// the channel would still look as it did before the save.
		await new Promise((resolve) => setTimeout(resolve, 1000));
		await load();
		sync();
	} finally {
		settingUp.value = false;
	}
}

// Sources

const pictureInput = ref<HTMLInputElement | null>(null);
const videoInput = ref<HTMLInputElement | null>(null);

function failureMessage(reason: StudioFailure, what: string): string {
	switch (reason) {
		case 'denied':
			return t('The browser did not allow access to the {what}. Allow it in the address bar and try again.', { what });
		case 'missing':
			return t('No {what} was found.', { what });
		case 'busy':
			return t('The {what} could not be started. Another program may be using it.', { what });
		case 'unreadable':
			return t('The file could not be read.');
		default:
			return t('This browser cannot provide a {what} here.', { what });
	}
}

async function add(what: string, action: () => Promise<void>) {
	try {
		await action();
	} catch (e: unknown) {
		// Closing the browser's own screen picker is a decision, not a failure.
		if (e instanceof StudioError && e.reason === 'denied' && what === t('screen')) return;
		toast.add({ title: failureMessage(e instanceof StudioError ? e.reason : 'unsupported', what), color: 'error' });
	}
}

const taken = (id: string) => engine.sources.value.some((s) => s.id === id);

const addItems = computed<DropdownMenuItem[][]>(() => {
	const cameras = engine.cameras.value.filter((d) => !taken(`camera:${d.id}`));
	const microphones = engine.microphones.value.filter((d) => !taken(`mic:${d.id}`));

	// Before the first permission the browser names no devices: the plain entries ask for its default one.
	const cameraItems: DropdownMenuItem[] =
		engine.cameras.value.length === 0
			? [{ label: t('Camera'), icon: 'i-lucide-video', onSelect: () => void add(t('camera'), () => engine.addCamera()) }]
			: cameras.map((d) => ({ label: d.label, icon: 'i-lucide-video', onSelect: () => void add(t('camera'), () => engine.addCamera(d.id)) }));
	const microphoneItems: DropdownMenuItem[] =
		engine.microphones.value.length === 0
			? [{ label: t('Microphone'), icon: 'i-lucide-mic', onSelect: () => void add(t('microphone'), () => engine.addMicrophone()) }]
			: microphones.map((d) => ({ label: d.label, icon: 'i-lucide-mic', onSelect: () => void add(t('microphone'), () => engine.addMicrophone(d.id)) }));

	return [
		cameraItems,
		microphoneItems,
		[
			{ label: t('Share a screen'), icon: 'i-lucide-monitor', onSelect: () => void add(t('screen'), () => engine.addScreen()) },
			{ label: t('Picture'), icon: 'i-lucide-image', onSelect: () => pictureInput.value?.click() },
			{ label: t('Video file'), icon: 'i-lucide-film', onSelect: () => videoInput.value?.click() },
		],
	].filter((group) => group.length !== 0);
});

async function startWithCamera() {
	await add(t('camera'), () => engine.addCamera());
	await add(t('microphone'), () => engine.addMicrophone());
}

function pickFile(event: Event, kind: 'image' | 'video') {
	const input = event.target as HTMLInputElement;
	const file = input.files?.[0];
	input.value = '';
	if (file) void add(t('file'), () => (kind === 'image' ? engine.addImage(file) : engine.addVideo(file)));
}

const sourceIcon = (source: StudioSource) =>
	({ camera: 'i-lucide-video', mic: 'i-lucide-mic', screen: 'i-lucide-monitor', image: 'i-lucide-image', video: 'i-lucide-film' })[source.kind];

const onStage = (id: string) => engine.stage.value.includes(id);
const isMain = (id: string) => engine.stage.value[0] === id;

// Stage

const stageHost = ref<HTMLElement | null>(null);
watch(stageHost, (host) => {
	if (!host) return;
	engine.canvas.className = 'block size-full';
	host.appendChild(engine.canvas);
});

const layoutItems = computed(() => {
	const items: Record<LayoutId, { label: string; icon: string }> = {
		solo: { label: t('One'), icon: 'i-lucide-square' },
		split: { label: t('Side by side'), icon: 'i-lucide-columns-2' },
		pip: { label: t('Picture in picture'), icon: 'i-lucide-picture-in-picture-2' },
		spotlight: { label: t('Main and side'), icon: 'i-lucide-panel-right' },
		grid: { label: t('Grid'), icon: 'i-lucide-layout-grid' },
	};
	return LAYOUTS.map((id, i) => ({ id, key: String(i + 1), ...items[id] }));
});

const setLayout = (layout: LayoutId) => (setup.value = { ...setup.value, layout });

// Scenes

const sceneOpen = ref(false);
const sceneName = ref('');
const sceneToDelete = ref<Scene | null>(null);

function saveScene() {
	const name = sceneName.value.trim();
	if (name === '') return;
	const scene = captureScene(setup.value, [...engine.stage.value], crypto.randomUUID(), name);
	setup.value = { ...setup.value, scenes: [...setup.value.scenes, scene].slice(-MAX_SCENES) };
	sceneOpen.value = false;
	sceneName.value = '';
}

function showScene(scene: Scene) {
	const next = applyScene(
		setup.value,
		scene,
		[...engine.stage.value],
		engine.sources.value.map((s) => s.id),
	);
	setup.value = next.setup;
	engine.setStage(next.stage);
}

function deleteScene() {
	const scene = sceneToDelete.value;
	sceneToDelete.value = null;
	if (scene) setup.value = { ...setup.value, scenes: setup.value.scenes.filter((s) => s.id !== scene.id) };
}

// On air

const goLiveOpen = ref(false);
const endOpen = ref(false);
const liveSince = ref(0);
const elapsed = ref(0);
let clock: ReturnType<typeof setInterval> | null = null;

const sending = computed(() => broadcast.state.value !== 'idle');
// On air without this Studio sending: an encoder, or a Studio in another browser.
const liveElsewhere = computed(() => !sending.value && (progress.value.state === 'connected' || (server.value?.live.includes(channelid.value) ?? false)));
const canGoLive = computed(() => !sending.value && !liveElsewhere.value && (server.value?.ffmpeg ?? '') !== '' && engine.stage.value.length !== 0);

const tally = computed<{ state: TallyState; label: string }>(() => {
	if (broadcast.state.value === 'stopping') return { state: 'off', label: 'STOPPING' };
	if (broadcast.state.value === 'sending' && progress.value.state === 'connected') return { state: 'live', label: 'LIVE' };
	if (sending.value) return { state: 'ready', label: 'CONNECTING' };
	if (liveElsewhere.value) return { state: 'live', label: 'LIVE' };
	return { state: 'off', label: 'OFF AIR' };
});

async function goLive() {
	goLiveOpen.value = false;
	if (!(await broadcast.start(channelid.value, setup.value.quality, engine.output()))) {
		toast.add({ title: t('Going live failed.'), description: broadcast.error.value, color: 'error' });
		return;
	}

	liveSince.value = Date.now();
	elapsed.value = 0;
	clock = setInterval(() => (elapsed.value = (Date.now() - liveSince.value) / 1000), 500);

	await api().StartIngest(channelid.value);
	await api().StartIngestSnapshot(channelid.value);
}

// Like "Disconnect" on the channel page: the channel and everything it publishes to stop.
async function takeChannelOffAir() {
	if (clock) clearInterval(clock);
	clock = null;
	await api().StopIngestSnapshot(channelid.value);
	await api().StopIngest(channelid.value);
	await api().StopAllEgresses(channelid.value);
}

async function end() {
	endOpen.value = false;
	await broadcast.stop();
	await takeChannelOffAir();
}

// The feed ended by itself (connection lost, ffmpeg gave up).
watch(
	() => broadcast.error.value,
	(why) => {
		if (why === '' || liveSince.value === 0) return;
		toast.add({ title: t('The programme went off air.'), description: why, color: 'error', duration: 0 });
		void takeChannelOffAir();
	},
);

onBeforeUnmount(() => {
	if (clock) clearInterval(clock);
});

// Leaving while on air ends the programme: ask first.
const leaveTo = ref<string | null>(null);
let leaveConfirmed = false;

onBeforeRouteLeave((to) => {
	if (!sending.value || leaveConfirmed) return true;
	leaveTo.value = to.fullPath;
	return false;
});

async function leave() {
	const to = leaveTo.value;
	leaveTo.value = null;
	if (to === null) return;
	await end();
	leaveConfirmed = true;
	await navigateTo(to);
}

function beforeUnload(event: BeforeUnloadEvent) {
	if (sending.value) event.preventDefault();
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));

// Panels

const panel = ref('graphics');
const panels = computed<TabsItem[]>(() => [
	{ label: t('Graphics'), value: 'graphics', slot: 'graphics' },
	{ label: t('Sound'), value: 'sound', slot: 'sound' },
	{ label: t('Publish'), value: 'publish', slot: 'publish' },
	{ label: t('Signal'), value: 'signal', slot: 'signal' },
]);

const qualityItems = computed(() =>
	(Object.keys(QUALITIES) as QualityId[]).map((value) => ({ value, label: `${value} · ${formatBitrate(QUALITIES[value].videoKbit)}` })),
);

const microphonesMuted = computed(() => {
	const mics = engine.sources.value.filter((s) => s.kind === 'mic');
	return mics.length !== 0 && mics.every((s) => s.muted);
});

function toggleMicrophones() {
	const mute = !microphonesMuted.value;
	for (const source of engine.sources.value) {
		if (source.kind === 'mic') engine.setMuted(source.id, mute);
	}
}

const toggleGraphic = (what: 'lowerThird' | 'banner' | 'logo') => {
	const usable = {
		lowerThird: setup.value.lowerThird.name.trim() !== '',
		banner: setup.value.banner.text.trim() !== '',
		logo: setup.value.logo.image !== '',
	};
	if (usable[what]) setup.value = { ...setup.value, [what]: { ...setup.value[what], show: !setup.value[what].show } };
};

defineShortcuts({
	'1': () => setLayout('solo'),
	'2': () => setLayout('split'),
	'3': () => setLayout('pip'),
	'4': () => setLayout('spotlight'),
	'5': () => setLayout('grid'),
	m: toggleMicrophones,
	n: () => toggleGraphic('lowerThird'),
	b: () => toggleGraphic('banner'),
	g: () => toggleGraphic('logo'),
});
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="title">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #trailing>
					<TallyBadge v-if="phase === 'ready'" v-bind="tally" />
					<span v-if="broadcast.state.value === 'sending'" class="font-mono text-sm text-muted tabular-nums" :aria-label="$t('Time on air')">
						{{ formatUptime(elapsed) }}
					</span>
				</template>
				<template #right>
					<UButton
						class="hidden sm:inline-flex"
						color="neutral"
						variant="ghost"
						icon="i-lucide-arrow-left"
						:label="$t('Channel')"
						:to="`/${channelid}`"
					/>
					<template v-if="phase === 'ready'">
						<UButton
							v-if="sending"
							color="error"
							icon="i-lucide-square"
							:label="$t('End')"
							:loading="broadcast.state.value === 'stopping'"
							@click="endOpen = true"
						/>
						<UButton v-else icon="i-lucide-radio" :label="$t('Go live')" :disabled="!canGoLive" @click="goLiveOpen = true" />
					</template>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="phase === 'loading'" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<UEmpty
				v-else-if="phase === 'no-rtmp'"
				class="py-16"
				icon="i-lucide-server-off"
				:title="$t('The RTMP server is switched off')"
				:description="
					$t('The Studio sends its programme to the channel over the RTMP server of the core. Switch it on in the settings, then restart the core.')
				"
				:actions="[{ label: $t('Open the RTMP settings'), icon: 'i-lucide-settings', to: '/settings?tab=rtmp' }]"
			/>

			<UEmpty
				v-else-if="phase === 'setup'"
				class="py-16"
				icon="i-lucide-clapperboard"
				:title="$t('Go live from this browser')"
				:description="
					$t(
						'The Studio mixes your camera, microphone, shared screen and graphics here and sends the programme to this channel. The channel has to be set up to receive it.',
					)
				"
				:actions="[
					{
						label: $t('Set up this channel for the Studio'),
						icon: 'i-lucide-wand-sparkles',
						loading: settingUp,
						onClick: () => (progress.valid ? (replaceOpen = true) : void setUpChannel()),
					},
				]"
			/>

			<div v-else class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(20rem,1fr)]">
				<section class="min-w-0 space-y-4">
					<UAlert
						v-if="!secure"
						color="warning"
						variant="subtle"
						icon="i-lucide-lock-open"
						:title="$t('This address is not secure')"
						:description="$t('Browsers hand out camera, microphone and screen only on an https address (or on localhost).')"
					/>
					<UAlert
						v-if="server && server.ffmpeg === ''"
						color="error"
						variant="subtle"
						icon="i-lucide-circle-alert"
						:title="$t('FFmpeg is missing on the server of this UI')"
						:description="$t('Without it the programme cannot be sent to the core. Install FFmpeg next to the UI, or set NUXT_FFMPEG_PATH.')"
					/>
					<UAlert
						v-else-if="server === null"
						color="warning"
						variant="subtle"
						icon="i-lucide-circle-alert"
						:title="$t('The server of this UI did not answer')"
						:description="$t('Going live needs it: it passes the programme on to the core.')"
						:actions="[{ label: $t('Retry'), onClick: load }]"
					/>
					<UAlert
						v-if="liveElsewhere"
						color="info"
						variant="subtle"
						icon="i-lucide-radio"
						:title="$t('This channel is already on air')"
						:description="$t('An encoder or another Studio is sending to it. It has to stop before this Studio can go live.')"
					/>

					<div class="relative aspect-video overflow-hidden rounded-lg bg-black">
						<div ref="stageHost" class="size-full" role="img" :aria-label="$t('Programme picture')" />
						<div
							v-if="engine.stage.value.length === 0"
							class="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center text-white"
						>
							<p class="text-lg">{{ $t('Nothing is on stage yet') }}</p>
							<UButton icon="i-lucide-video" :label="$t('Start with camera and microphone')" @click="startWithCamera" />
						</div>
					</div>

					<div class="flex flex-wrap items-center gap-2" role="group" :aria-label="$t('Layout')">
						<span class="mr-1 text-sm text-muted">{{ $t('Layout') }}</span>
						<UTooltip v-for="item in layoutItems" :key="item.id" :text="item.label" :kbds="[item.key]">
							<UButton
								:icon="item.icon"
								:color="setup.layout === item.id ? 'primary' : 'neutral'"
								:variant="setup.layout === item.id ? 'solid' : 'outline'"
								:aria-label="item.label"
								:aria-pressed="setup.layout === item.id"
								@click="setLayout(item.id)"
							/>
						</UTooltip>

						<span class="mr-1 ml-auto text-sm text-muted">{{ $t('Scenes') }}</span>
						<UFieldGroup v-for="scene in setup.scenes" :key="scene.id">
							<UButton color="neutral" variant="outline" :label="scene.name" @click="showScene(scene)" />
							<UButton
								color="neutral"
								variant="outline"
								icon="i-lucide-x"
								:aria-label="$t('Delete the scene {name}', { name: scene.name })"
								@click="sceneToDelete = scene"
							/>
						</UFieldGroup>
						<UTooltip :text="$t('Save this layout, stage and graphics as a scene')">
							<UButton
								color="neutral"
								variant="ghost"
								icon="i-lucide-bookmark-plus"
								:label="$t('Save scene')"
								:disabled="setup.scenes.length >= MAX_SCENES"
								@click="sceneOpen = true"
							/>
						</UTooltip>
					</div>

					<section class="space-y-3" :aria-label="$t('Sources')">
						<div class="flex items-center justify-between">
							<h2 class="font-medium text-highlighted">{{ $t('Sources') }}</h2>
							<UDropdownMenu :items="addItems">
								<UButton color="neutral" variant="subtle" size="sm" icon="i-lucide-plus" :label="$t('Add')" />
							</UDropdownMenu>
							<input ref="pictureInput" type="file" accept="image/*" class="hidden" @change="(e) => pickFile(e, 'image')" />
							<input ref="videoInput" type="file" accept="video/*" class="hidden" @change="(e) => pickFile(e, 'video')" />
						</div>

						<p v-if="engine.sources.value.length === 0" class="text-sm text-muted">
							{{ $t('Add a camera, a microphone, a shared screen, a picture or a video file.') }}
						</p>

						<ul v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
							<li
								v-for="source in engine.sources.value"
								:key="source.id"
								class="space-y-2 rounded-lg border bg-elevated p-2"
								:class="onStage(source.id) ? 'border-primary' : 'border-default'"
							>
								<StudioThumbnail v-if="source.video" :id="source.id" :engine="engine" />
								<div v-else class="flex aspect-video items-center justify-center rounded-md bg-accented px-4">
									<StudioMeter class="w-full" :level="engine.levels[source.id] ?? 0" :label="$t('Level of {name}', { name: source.label })" />
								</div>

								<div class="flex items-center gap-2">
									<UIcon :name="sourceIcon(source)" class="size-4 shrink-0 text-muted" />
									<span class="min-w-0 flex-1 truncate text-sm text-highlighted" :title="source.label">{{ source.label }}</span>
									<UBadge v-if="isMain(source.id)" color="neutral" variant="subtle" :label="$t('Main')" />
								</div>

								<div class="flex flex-wrap items-center gap-1">
									<UButton
										v-if="source.video"
										size="sm"
										:color="onStage(source.id) ? 'primary' : 'neutral'"
										:variant="onStage(source.id) ? 'subtle' : 'outline'"
										:icon="onStage(source.id) ? 'i-lucide-eye' : 'i-lucide-eye-off'"
										:label="onStage(source.id) ? $t('On stage') : $t('Off stage')"
										:aria-pressed="onStage(source.id)"
										@click="engine.toggleStage(source.id)"
									/>
									<UButton
										v-if="onStage(source.id) && !isMain(source.id)"
										size="sm"
										color="neutral"
										variant="ghost"
										icon="i-lucide-maximize-2"
										:label="$t('Make main')"
										@click="engine.bringFirst(source.id)"
									/>
									<template v-if="source.kind === 'video'">
										<UButton
											size="sm"
											color="neutral"
											variant="ghost"
											:icon="source.paused ? 'i-lucide-play' : 'i-lucide-pause'"
											:aria-label="source.paused ? $t('Play {name}', { name: source.label }) : $t('Pause {name}', { name: source.label })"
											@click="engine.togglePlayback(source.id)"
										/>
										<UButton
											size="sm"
											color="neutral"
											variant="ghost"
											icon="i-lucide-skip-back"
											:aria-label="$t('Play {name} from the start', { name: source.label })"
											@click="engine.restartPlayback(source.id)"
										/>
									</template>
									<UButton
										v-if="source.kind === 'mic'"
										size="sm"
										:color="source.muted ? 'error' : 'neutral'"
										:variant="source.muted ? 'subtle' : 'outline'"
										:icon="source.muted ? 'i-lucide-mic-off' : 'i-lucide-mic'"
										:label="source.muted ? $t('Muted') : $t('Live')"
										:aria-pressed="source.muted"
										@click="engine.setMuted(source.id, !source.muted)"
									/>
									<UButton
										class="ml-auto"
										size="sm"
										color="neutral"
										variant="ghost"
										icon="i-lucide-trash-2"
										:aria-label="$t('Remove {name}', { name: source.label })"
										@click="engine.remove(source.id)"
									/>
								</div>
							</li>
						</ul>
					</section>
				</section>

				<aside class="min-w-0">
					<UTabs v-model="panel" :items="panels" class="w-full">
						<template #graphics>
							<StudioGraphics v-model="setup" class="pt-4" />
						</template>
						<template #sound>
							<StudioMixer :engine="engine" class="pt-4" />
						</template>
						<template #publish>
							<div class="space-y-3 pt-4">
								<p class="text-sm text-muted">
									{{ $t('Switch on where the programme goes. A publication starts sending as soon as the channel is on air.') }}
								</p>
								<ChannelPublications :channelid="channelid" />
							</div>
						</template>
						<template #signal>
							<div class="space-y-4 pt-4">
								<UFormField :label="$t('Picture quality')" :help="sending ? $t('Can be changed while off air.') : undefined">
									<USelect
										class="w-full"
										:model-value="setup.quality"
										:items="qualityItems"
										:disabled="sending"
										@update:model-value="(quality) => (setup = { ...setup, quality: quality as QualityId })"
									/>
								</UFormField>
								<p v-if="!sending" class="text-sm text-muted">{{ $t('Figures appear here while the Studio is on air.') }}</p>
								<dl class="grid grid-cols-2 gap-3">
									<div class="rounded-lg bg-elevated px-3 py-2 text-center">
										<dd class="font-mono text-lg font-semibold text-highlighted tabular-nums">
											{{ formatBitrate(broadcast.uploadKbit.value) }}
										</dd>
										<dt class="text-xs text-muted">{{ $t('Upload from this browser') }}</dt>
									</div>
									<div class="rounded-lg bg-elevated px-3 py-2 text-center">
										<dd
											class="font-mono text-lg font-semibold tabular-nums"
											:class="broadcast.waiting.value > 6 ? 'text-error' : 'text-highlighted'"
										>
											{{ (broadcast.waiting.value / 2).toFixed(1) }} s
										</dd>
										<dt class="text-xs text-muted">{{ $t('Waiting to be sent') }}</dt>
									</div>
									<div class="rounded-lg bg-elevated px-3 py-2 text-center">
										<dd class="font-mono text-lg font-semibold text-highlighted tabular-nums">
											{{ formatBitrate(broadcast.progress.value.bitrateKbit) }}
										</dd>
										<dt class="text-xs text-muted">{{ $t('Sent to the core') }}</dt>
									</div>
									<div class="rounded-lg bg-elevated px-3 py-2 text-center">
										<dd class="font-mono text-lg font-semibold text-highlighted tabular-nums">
											{{ broadcast.progress.value.fps.toFixed(0) }}
										</dd>
										<dt class="text-xs text-muted">{{ $t('FPS') }}</dt>
									</div>
									<div class="rounded-lg bg-elevated px-3 py-2 text-center">
										<dd
											class="font-mono text-lg font-semibold tabular-nums"
											:class="
												sending && broadcast.progress.value.speed > 0 && broadcast.progress.value.speed < 0.9
													? 'text-error'
													: 'text-highlighted'
											"
										>
											{{ broadcast.progress.value.speed.toFixed(2) }}×
										</dd>
										<dt class="text-xs text-muted">{{ $t('Encoding speed') }}</dt>
									</div>
									<div class="rounded-lg bg-elevated px-3 py-2 text-center">
										<dd class="font-mono text-lg font-semibold text-highlighted tabular-nums">{{ formatBitrate(progress.bitrate) }}</dd>
										<dt class="text-xs text-muted">{{ $t('Channel bitrate') }}</dt>
									</div>
								</dl>
								<p class="text-sm text-muted">
									{{ $t('Keys: 1–5 layout, M microphones, N name plate, B banner, G logo.') }}
								</p>
							</div>
						</template>
					</UTabs>
				</aside>
			</div>

			<UModal v-model:open="replaceOpen" :title="$t('Replace the source of this channel?')">
				<template #body>
					<p>
						{{
							$t(
								'This channel takes its picture from another source now. The Studio replaces it; the publications and the viewer page stay as they are.',
							)
						}}
					</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="replaceOpen = false" />
					<UButton color="error" :label="$t('Replace the source')" @click="setUpChannel" />
				</template>
			</UModal>

			<UModal v-model:open="goLiveOpen" :title="$t('Go live?')">
				<template #body>
					<p>{{ $t('The programme goes on air on this channel, and to every publication that is switched on.') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="goLiveOpen = false" />
					<UButton icon="i-lucide-radio" :label="$t('Go live')" @click="goLive" />
				</template>
			</UModal>

			<UModal v-model:open="endOpen" :title="$t('End the programme?')">
				<template #body>
					<p>{{ $t('The channel goes off air and its publications stop.') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="endOpen = false" />
					<UButton color="error" icon="i-lucide-square" :label="$t('End')" @click="end" />
				</template>
			</UModal>

			<UModal :open="leaveTo !== null" :title="$t('Leave the Studio?')" @update:open="(open) => !open && (leaveTo = null)">
				<template #body>
					<p>{{ $t('You are on air. Leaving the Studio ends the programme.') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Stay')" @click="leaveTo = null" />
					<UButton color="error" :label="$t('End and leave')" @click="leave" />
				</template>
			</UModal>

			<UModal v-model:open="sceneOpen" :title="$t('Save scene')">
				<template #body>
					<UFormField :label="$t('Name')" :help="$t('The layout, what is on stage and the graphics shown now are saved under this name.')">
						<UInput v-model="sceneName" class="w-full" :maxlength="40" autofocus @keydown.enter="saveScene" />
					</UFormField>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="sceneOpen = false" />
					<UButton :label="$t('Save')" :disabled="sceneName.trim() === ''" @click="saveScene" />
				</template>
			</UModal>

			<UModal :open="sceneToDelete !== null" :title="$t('Delete the scene?')" @update:open="(open) => !open && (sceneToDelete = null)">
				<template #body>
					<p>{{ $t('The scene {name} is removed. What is on air does not change.', { name: sceneToDelete?.name ?? '' }) }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="sceneToDelete = null" />
					<UButton color="error" :label="$t('Delete')" @click="deleteScene" />
				</template>
			</UModal>
		</template>
	</UDashboardPanel>
</template>
