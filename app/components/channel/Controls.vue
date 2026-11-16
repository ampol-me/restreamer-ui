<script setup lang="ts">
import type { IngestMetadata } from '#shared/metadata';

// "Processing & Control" of a channel: HLS output, RTMP/SRT re-publish, snapshot, process, limits.
type Control = IngestMetadata['control'];

const props = defineProps<{
	// Whether the core's RTMP/SRT servers are enabled (the outputs need them).
	rtmpAvailable: boolean;
	srtAvailable: boolean;
	// Codec of the video the channel outputs; some containers cannot carry every codec.
	videoCodec: string;
}>();

const control = defineModel<Control>({ required: true });

const { t } = useI18n();

function set<S extends keyof Control>(section: S, values: Partial<Control[S]>) {
	control.value = { ...control.value, [section]: { ...control.value[section], ...values } };
}

const toInt = (value: unknown, fallback: number) => {
	const n = Number.parseInt(String(value), 10);
	return Number.isFinite(n) && n >= 0 ? n : fallback;
};

const storageItems = computed(() => [
	{ label: t('In-memory'), value: 'memfs' },
	{ label: t('Disk'), value: 'diskfs' },
]);

const versionItems = computed(() => [
	{ label: '3', value: 3 },
	{ label: t('6 (+ guaranteed to start with a Key frame)'), value: 6 },
	{ label: t('7 (+ fragmented MP4 format)'), value: 7 },
]);

// AV1 only fits into fragmented MP4: the ingest is created with version 7 regardless of this setting.
const av1 = computed(() => props.videoCodec === 'av1');
</script>

<template>
	<div class="space-y-8">
		<section class="space-y-4">
			<h3 class="font-medium text-highlighted">{{ $t('HLS output') }}</h3>

			<UCheckbox
				:model-value="control.hls.lhls"
				:label="$t('Low latency Mode (LHLS/CMAF)')"
				:description="$t('Experimental function. Older browsers and clients may not be supported.')"
				@update:model-value="(v) => set('hls', { lhls: v === true })"
			/>

			<div class="grid gap-4 sm:grid-cols-2">
				<UFormField :label="$t('Storage')" :help="$t('Where to store the HLS playlist and segments. In-Memory is recommended.')">
					<USelect :model-value="control.hls.storage" :items="storageItems" class="w-full" @update:model-value="(v) => set('hls', { storage: v })" />
				</UFormField>

				<UFormField
					:label="$t('EXT-X-VERSION')"
					:help="
						av1
							? $t('AV1 video requires version 7 (fragmented MP4). It is applied automatically.')
							: $t('Playlist version (M3U8). Version 3 has the best browser/client compatibility.')
					"
				>
					<USelect
						:model-value="av1 && !control.hls.lhls ? 7 : control.hls.version"
						:items="versionItems"
						:disabled="av1 && !control.hls.lhls"
						class="w-full"
						@update:model-value="(v) => set('hls', { version: Number(v) })"
					/>
				</UFormField>

				<UFormField
					:label="$t('Segment length (seconds)')"
					:help="$t('Segment will be cut on the following keyframe after this time has passed. 2 is recommended.')"
				>
					<UInput
						:model-value="control.hls.segmentDuration"
						type="number"
						min="1"
						class="w-full"
						@update:model-value="(v) => set('hls', { segmentDuration: toInt(v, 2) })"
					/>
				</UFormField>

				<UFormField
					:label="$t('List size (segments)')"
					:help="$t('The maximum number of playlist segments. 0 will contain all the segments. 6 is recommended.')"
				>
					<UInput
						:model-value="control.hls.listSize"
						type="number"
						min="0"
						class="w-full"
						@update:model-value="(v) => set('hls', { listSize: toInt(v, 6) })"
					/>
				</UFormField>
			</div>

			<UCheckbox
				:model-value="control.hls.master_playlist"
				:label="$t('Master playlist (increases browser/client compatibility)')"
				@update:model-value="(v) => set('hls', { master_playlist: v === true })"
			/>
			<UCheckbox
				:model-value="control.hls.cleanup"
				:label="$t('Automatic cleanup of all media data')"
				@update:model-value="(v) => set('hls', { cleanup: v === true })"
			/>
		</section>

		<section class="space-y-3">
			<h3 class="font-medium text-highlighted">{{ $t('RTMP output') }}</h3>
			<UCheckbox
				v-if="rtmpAvailable"
				:model-value="control.rtmp.enable"
				:label="$t('Enable')"
				:description="$t('Make the channel available as an RTMP stream (experimental).')"
				@update:model-value="(v) => set('rtmp', { enable: v === true })"
			/>
			<UAlert
				v-else
				color="neutral"
				variant="subtle"
				icon="i-lucide-info"
				:title="$t('The RTMP output requires the RTMP Server.')"
				:actions="[{ label: $t('Enable now'), to: '/settings?tab=rtmp' }]"
			/>
		</section>

		<section class="space-y-3">
			<h3 class="font-medium text-highlighted">{{ $t('SRT output') }}</h3>
			<template v-if="srtAvailable">
				<UCheckbox
					:model-value="control.srt.enable"
					:label="$t('Enable')"
					:description="$t('Make the channel available as an SRT stream (experimental).')"
					@update:model-value="(v) => set('srt', { enable: v === true })"
				/>
				<UAlert
					v-if="av1 && control.srt.enable"
					color="warning"
					variant="subtle"
					icon="i-lucide-triangle-alert"
					:title="$t('AV1 video cannot be sent over the SRT output (MPEG-TS). It is left out for this channel.')"
				/>
			</template>
			<UAlert
				v-else
				color="neutral"
				variant="subtle"
				icon="i-lucide-info"
				:title="$t('The SRT output requires the SRT Server.')"
				:actions="[{ label: $t('Enable now'), to: '/settings?tab=srt' }]"
			/>
		</section>

		<section class="space-y-4">
			<h3 class="font-medium text-highlighted">{{ $t('Snapshot') }}</h3>
			<UCheckbox
				:model-value="control.snapshot.enable"
				:label="$t('Enable snapshots')"
				@update:model-value="(v) => set('snapshot', { enable: v === true })"
			/>
			<UFormField
				:label="$t('Interval (seconds)')"
				:help="$t('Seconds until the snapshot/thumbnail of the video source is updated.')"
				class="sm:max-w-xs"
			>
				<UInput
					:model-value="control.snapshot.interval"
					type="number"
					min="1"
					class="w-full"
					:disabled="!control.snapshot.enable"
					@update:model-value="(v) => set('snapshot', { interval: toInt(v, 60) })"
				/>
			</UFormField>
		</section>

		<section class="space-y-4">
			<h3 class="font-medium text-highlighted">{{ $t('Process') }}</h3>
			<UCheckbox
				:model-value="control.process.reconnect"
				:label="$t('Reconnect')"
				@update:model-value="(v) => set('process', { reconnect: v === true })"
			/>
			<UCheckbox
				:model-value="control.process.low_delay"
				:label="$t('Low latency (Buffer)')"
				@update:model-value="(v) => set('process', { low_delay: v === true })"
			/>
			<div class="grid gap-4 sm:grid-cols-2">
				<UFormField :label="$t('Reconnect delay (seconds)')" :help="$t('Seconds until a process is restarted.')">
					<UInput
						:model-value="control.process.delay"
						type="number"
						min="0"
						class="w-full"
						:disabled="!control.process.reconnect"
						@update:model-value="(v) => set('process', { delay: toInt(v, 15) })"
					/>
				</UFormField>
				<UFormField :label="$t('Stale timeout (seconds)')" :help="$t('Seconds until a staled process is terminated.')">
					<UInput
						:model-value="control.process.staleTimeout"
						type="number"
						min="0"
						class="w-full"
						@update:model-value="(v) => set('process', { staleTimeout: toInt(v, 30) })"
					/>
				</UFormField>
			</div>
		</section>

		<section class="space-y-4">
			<h3 class="font-medium text-highlighted">{{ $t('Limits') }}</h3>
			<div class="grid gap-4 sm:grid-cols-3">
				<UFormField :label="$t('CPU Limit (percent)')" :help="$t('CPU usage limit in percent (0-100%), 0 for unlimited.')">
					<UInput
						:model-value="control.limits.cpu_usage"
						type="number"
						min="0"
						max="100"
						class="w-full"
						@update:model-value="(v) => set('limits', { cpu_usage: Math.min(100, toInt(v, 0)) })"
					/>
				</UFormField>
				<UFormField :label="$t('Memory Limit (megabytes)')" :help="$t('Memory usage limit in megabytes, 0 for unlimited.')">
					<UInput
						:model-value="control.limits.memory_mbytes"
						type="number"
						min="0"
						class="w-full"
						@update:model-value="(v) => set('limits', { memory_mbytes: toInt(v, 0) })"
					/>
				</UFormField>
				<UFormField :label="$t('Threshold (seconds)')" :help="$t('Number of seconds the limits are allowed to be exceeded.')">
					<UInput
						:model-value="control.limits.waitfor_seconds"
						type="number"
						min="0"
						class="w-full"
						@update:model-value="(v) => set('limits', { waitfor_seconds: toInt(v, 5) })"
					/>
				</UFormField>
			</div>
		</section>
	</div>
</template>
