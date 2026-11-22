<script setup lang="ts">
import { getDefaultIngestMetadata } from '#shared/metadata';
import { anonymize } from '#shared/core/anonymizer';
import { sendTarget } from '#shared/ingest/sendTo';
import { emptyProgress, type CoreActiveConfig, type ProcessProgress, type PublicAddressKind, type ChannelAddressKind } from '#shared/core/types';
import type { IngestMetadata } from '#shared/metadata';
import { formatBitrate, formatUptime } from '~/utils/format';
import { tallyFor } from '~/utils/tally';

// Main view of a channel: live preview, ingest state and controls, content URLs, publications.
const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { api, sync } = useRestreamer();

const channelid = computed(() => String(route.params.channelid));

const ready = ref(false);
const progress = ref<ProcessProgress>(emptyProgress());
// What the user just asked for, shown until the core's state catches up.
const pending = ref<'connecting' | 'disconnecting' | null>(null);
const metadata = ref<IngestMetadata>(getDefaultIngestMetadata());
const coreConfig = ref<CoreActiveConfig | null>(null);

const detailsOpen = ref(false);
const reportOpen = ref(false);

// After a (re)connect the snapshot process is restarted once the stream is up, like the legacy UI.
let refreshSnapshotOnConnect = false;

async function load() {
	coreConfig.value = api().ConfigActive();
	metadata.value = { ...getDefaultIngestMetadata(), ...(await api().GetIngestMetadata(channelid.value)) };
}

async function update() {
	const selected = api().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await navigateTo('/', { replace: true });
		return;
	}

	const next = await api().GetIngestProgress(channelid.value);

	if (next.state === 'connecting') {
		refreshSnapshotOnConnect = true;
	} else if (next.state === 'connected' && refreshSnapshotOnConnect) {
		refreshSnapshotOnConnect = false;
		setTimeout(async () => {
			await api().StopIngestSnapshot(channelid.value);
			await api().StartIngestSnapshot(channelid.value);
		}, 100);
	}

	// The channel re-publishes to an internal server that is switched off in the core.
	const control = metadata.value.control;
	const network = coreConfig.value?.source?.network;
	if (control?.rtmp?.enable && network && !network.rtmp.enabled) {
		next.state = 'error';
		next.error = 'RTMP server is not enabled, but required.';
	} else if (control?.srt?.enable && network && !network.srt.enabled) {
		next.state = 'error';
		next.error = 'SRT server is not enabled, but required.';
	}

	if (pending.value && next.state !== 'disconnected' && pending.value === 'connecting') pending.value = null;
	if (pending.value === 'disconnecting' && next.state === 'disconnected') pending.value = null;

	progress.value = next;
	ready.value = true;
}

const { refresh } = usePolling(update, 1000);

onMounted(load);
watch(channelid, async () => {
	ready.value = false;
	await load();
	await refresh();
});

const state = computed(() => pending.value ?? progress.value.state);

async function connect() {
	pending.value = 'connecting';
	refreshSnapshotOnConnect = true;
	await api().StartIngest(channelid.value);
	await api().StartIngestSnapshot(channelid.value);
}

async function disconnect() {
	pending.value = 'disconnecting';
	await api().StopIngestSnapshot(channelid.value);
	await api().StopIngest(channelid.value);
	await api().StopAllEgresses(channelid.value);
}

async function reconnect() {
	await disconnect();
	await connect();
}

const channel = computed(() => api().GetChannel(channelid.value));
const title = computed(() => channel.value?.name || t('Main channel'));
const storage = computed<'memfs' | 'diskfs'>(() => (metadata.value.control?.hls?.storage === 'diskfs' ? 'diskfs' : 'memfs'));
const manifest = computed(() => api().GetChannelAddress(`hls+${storage.value}` as ChannelAddressKind, channelid.value));
const poster = computed(() => api().GetChannelAddress(`snapshot+${storage.value}` as ChannelAddressKind, channelid.value));

// For a channel that waits for an encoder: where the encoder has to send to.
const target = computed(() => sendTarget(metadata.value.sources?.[0], coreConfig.value?.source?.network));

const contentUrls = computed(() => {
	const urls = [{ label: 'HLS', value: api().GetPublicAddress(`hls+${storage.value}` as PublicAddressKind, channelid.value) }];
	if (metadata.value.control?.rtmp?.enable) urls.push({ label: 'RTMP', value: api().GetPublicAddress('rtmp', channelid.value) });
	if (metadata.value.control?.srt?.enable) urls.push({ label: 'SRT', value: api().GetPublicAddress('srt', channelid.value) });
	urls.push({ label: t('Snapshot'), value: api().GetPublicAddress('snapshot+memfs', channelid.value) });
	return urls;
});

async function copy(label: string, value: string) {
	try {
		await navigator.clipboard.writeText(value);
		toast.add({ title: t('{label} address copied', { label }), color: 'success' });
	} catch {
		toast.add({ title: t('Copying to the clipboard failed'), color: 'error' });
	}
}

onMounted(sync);
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="title">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #trailing>
					<TallyBadge v-if="ready && progress.valid" v-bind="tallyFor(state)" />
				</template>
				<template #right>
					<UButton v-if="ready" icon="i-lucide-clapperboard" color="neutral" variant="ghost" :label="$t('Studio')" :to="`/${channelid}/studio`" />
					<UButton
						v-if="ready && progress.valid"
						icon="i-lucide-monitor-play"
						color="neutral"
						variant="ghost"
						:label="$t('Viewer page')"
						:to="`/${channelid}/viewer`"
					/>
					<UButton
						v-if="ready && progress.valid"
						icon="i-lucide-pencil"
						color="neutral"
						variant="ghost"
						:label="$t('Edit')"
						:to="`/${channelid}/edit`"
					/>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex flex-col items-center gap-3 py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
				<p>{{ $t('Retrieving stream data ...') }}</p>
			</div>

			<UEmpty
				v-else-if="!progress.valid"
				class="py-16"
				icon="i-lucide-video"
				:title="$t('Welcome to Restreamer')"
				:description="$t('This channel has no video source yet. Set one up to start streaming.')"
				:actions="[
					{ label: $t('Video setup'), icon: 'i-lucide-wand-sparkles', to: `/${channelid}/edit/wizard` },
					{ label: $t('Go live from this browser'), icon: 'i-lucide-clapperboard', color: 'neutral', variant: 'outline', to: `/${channelid}/studio` },
				]"
			/>

			<div v-else class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(18rem,1fr)]">
				<section class="min-w-0 space-y-4">
					<div class="relative aspect-video overflow-hidden rounded-lg bg-black text-white">
						<HlsPlayer v-if="state === 'connected'" :key="manifest" :src="manifest" :poster="poster" autoplay />

						<div v-else class="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm">
							<template v-if="state === 'connecting'">
								<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
								<p>{{ $t('Connecting ...') }}</p>
							</template>

							<template v-else-if="state === 'error'">
								<UIcon name="i-lucide-triangle-alert" class="size-10 text-warning" />
								<p class="font-medium">{{ $t('Error: {message}', { message: anonymize(progress.error) || 'unknown' }) }}</p>
								<UButton
									color="neutral"
									variant="link"
									class="text-white underline"
									:label="$t('Please check the process log')"
									@click="detailsOpen = true"
								/>
								<p v-if="progress.reconnect !== -1">{{ $t('Reconnecting in {seconds}s', { seconds: progress.reconnect }) }}</p>
								<p v-else>{{ $t('You have to reconnect manually') }}</p>
							</template>

							<p v-else class="text-lg">{{ $t('No video') }}</p>
						</div>
					</div>

					<section v-if="target" class="space-y-3 rounded-lg border border-default bg-elevated p-4" :aria-label="$t('Send your stream here')">
						<div>
							<h2 class="font-semibold text-highlighted">{{ $t('Send your stream here') }}</h2>
							<p class="text-sm text-muted">
								{{
									target.protocol === 'rtmp'
										? $t('Enter these two values in your encoder. In OBS: Settings, Stream, Service "Custom".')
										: $t('Enter this address in your encoder as the SRT destination.')
								}}
							</p>
						</div>
						<div v-if="target.server && target.key" class="grid gap-3 sm:grid-cols-2">
							<PlayerCopyField :label="$t('Server')" :value="target.server" />
							<PlayerCopyField :label="$t('Stream key')" :value="target.key" secret />
						</div>
						<PlayerCopyField v-else :label="$t('Address')" :value="target.address" secret />
						<p class="text-sm text-muted">
							{{ state === 'connected' ? $t('The stream is arriving.') : $t('Start the stream in your encoder, then select Connect below.') }}
						</p>
					</section>

					<dl class="grid grid-cols-3 gap-3">
						<div class="rounded-lg bg-elevated px-3 py-2 text-center">
							<dd class="font-mono text-lg font-semibold text-highlighted tabular-nums">{{ formatUptime(progress.time) }}</dd>
							<dt class="text-xs text-muted">{{ $t('Uptime') }}</dt>
						</div>
						<div class="rounded-lg bg-elevated px-3 py-2 text-center">
							<dd class="font-mono text-lg font-semibold text-highlighted tabular-nums">{{ formatBitrate(progress.bitrate) }}</dd>
							<dt class="text-xs text-muted">{{ $t('Bitrate') }}</dt>
						</div>
						<div class="rounded-lg bg-elevated px-3 py-2 text-center">
							<dd class="font-mono text-lg font-semibold text-highlighted tabular-nums">{{ Number(progress.fps || 0).toFixed(0) }}</dd>
							<dt class="text-xs text-muted">{{ $t('FPS') }}</dt>
						</div>
					</dl>

					<div class="flex flex-wrap items-center gap-2">
						<span class="mr-auto text-sm text-muted">{{ $t('Content URL') }}</span>
						<UButton
							v-for="url in contentUrls"
							:key="url.label"
							size="sm"
							color="neutral"
							variant="outline"
							trailing-icon="i-lucide-copy"
							:label="url.label"
							:title="url.value"
							@click="copy(url.label, url.value)"
						/>
					</div>

					<div class="flex flex-wrap gap-2">
						<UButton v-if="state === 'disconnected'" block size="lg" icon="i-lucide-play" :label="$t('Connect')" @click="connect" />
						<template v-else>
							<UButton
								class="flex-1 justify-center"
								size="lg"
								color="error"
								variant="outline"
								icon="i-lucide-square"
								:loading="state === 'disconnecting'"
								:disabled="state === 'disconnecting'"
								:label="state === 'disconnecting' ? $t('Disconnecting ...') : $t('Disconnect')"
								@click="disconnect"
							/>
							<UButton
								v-if="state === 'error' && progress.reconnect === -1"
								class="flex-1 justify-center"
								size="lg"
								icon="i-lucide-refresh-cw"
								:label="$t('Reconnect')"
								@click="reconnect"
							/>
						</template>
					</div>

					<div class="flex justify-end gap-4 text-sm">
						<UButton color="neutral" variant="link" :label="$t('Process details')" @click="detailsOpen = true" />
						<UButton color="neutral" variant="link" :label="$t('Process report')" @click="reportOpen = true" />
					</div>
				</section>

				<ChannelPublications :channelid="channelid" />
			</div>

			<ChannelProcessDetails
				v-model:open="detailsOpen"
				:title="$t('Process details')"
				:progress="progress"
				:load-log="() => api().GetIngestLog(channelid)"
			/>
			<ChannelProcessReport
				v-model:open="reportOpen"
				:title="$t('Process report')"
				:load="() => api().GetIngestDebug(channelid)"
				:filename="`restreamer-${channelid}-report.json`"
			/>
		</template>
	</UDashboardPanel>
</template>
