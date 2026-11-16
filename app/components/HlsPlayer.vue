<script setup lang="ts">
// Plays an HLS manifest: natively where the browser can (Safari), through hls.js elsewhere.
const props = defineProps<{ src: string; poster?: string; autoplay?: boolean }>();

const video = ref<HTMLVideoElement | null>(null);
const state = ref<'loading' | 'playing' | 'offline' | 'unsupported'>('loading');

let hls: import('hls.js').default | null = null;
let retry: ReturnType<typeof setTimeout> | null = null;

function teardown() {
	if (retry) clearTimeout(retry);
	retry = null;
	hls?.destroy();
	hls = null;
}

// A channel that is not live has no manifest yet: keep looking for it.
function scheduleRetry() {
	state.value = 'offline';
	if (retry) clearTimeout(retry);
	retry = setTimeout(load, 5000);
}

async function load() {
	const el = video.value;
	if (!el) return;

	teardown();
	state.value = 'loading';

	const { default: Hls } = await import('hls.js');

	if (Hls.isSupported()) {
		hls = new Hls({ liveSyncDurationCount: 3, xhrSetup: (xhr) => (xhr.withCredentials = true) });
		hls.on(Hls.Events.MANIFEST_PARSED, () => {
			state.value = 'playing';
			if (props.autoplay) void el.play().catch(() => {});
		});
		hls.on(Hls.Events.ERROR, (_event, data) => {
			if (!data.fatal) return;
			if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
				hls?.recoverMediaError();
				return;
			}
			teardown();
			scheduleRetry();
		});
		hls.loadSource(props.src);
		hls.attachMedia(el);
	} else if (el.canPlayType('application/vnd.apple.mpegurl')) {
		el.src = props.src;
		el.onloadedmetadata = () => {
			state.value = 'playing';
			if (props.autoplay) void el.play().catch(() => {});
		};
		el.onerror = scheduleRetry;
	} else {
		state.value = 'unsupported';
	}
}

onMounted(load);
watch(() => props.src, load);
onBeforeUnmount(teardown);
</script>

<template>
	<div class="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
		<video ref="video" class="size-full" :poster="poster" controls playsinline muted />

		<div
			v-if="state !== 'playing'"
			class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-sm text-white"
		>
			<UIcon v-if="state === 'loading'" name="i-lucide-loader-circle" class="size-8 animate-spin" />
			<UIcon v-else name="i-lucide-video-off" class="size-8" />
			<p v-if="state === 'offline'">{{ $t('This channel is not live right now.') }}</p>
			<p v-else-if="state === 'unsupported'">{{ $t('This browser cannot play the stream.') }}</p>
		</div>
	</div>
</template>
