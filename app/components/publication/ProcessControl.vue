<script setup lang="ts">
import type { EgressControl } from '#shared/core/types.publication';

// Process settings of a publication: where it reads the channel from ('source'), or how the process is
// restarted and limited ('process').
const props = defineProps<{
	control: EgressControl;
	section: 'source' | 'process';
	// What the channel offers: 'hls+memfs' | 'hls+diskfs' | 'rtmp' | 'srt'.
	sources?: string[];
}>();

const emit = defineEmits<{
	// `automatic` is true if only missing defaults were filled in, i.e. the user changed nothing.
	'update:control': [control: EgressControl, automatic: boolean];
}>();

const SOURCES = ['hls+memfs', 'hls+diskfs', 'rtmp', 'srt'];

// Metadata stored by an older version may lack some of these, whatever its type promises.
const PROCESS_DEFAULTS: EgressControl['process'] = { autostart: false, reconnect: true, delay: 30, staleTimeout: 30, low_delay: false };
const LIMITS_DEFAULTS: EgressControl['limits'] = { cpu_usage: 0, memory_mbytes: 0, waitfor_seconds: 5 };

function withDefaults(control: EgressControl): EgressControl {
	const stored: string | undefined = control.source?.source;

	return {
		...control,
		process: { ...PROCESS_DEFAULTS, ...control.process },
		limits: { ...LIMITS_DEFAULTS, ...control.limits },
		source: { ...control.source, source: stored !== undefined && SOURCES.includes(stored) ? stored : 'hls+memfs' },
	};
}

const settings = computed(() => withDefaults(props.control));

// Store the defaults, so that a publication saved without visiting this form is complete as well.
onMounted(() => emit('update:control', settings.value, true));

// The core client parses these with parseInt(); an emptied field counts as 0 instead of NaN.
const toNumber = (value: unknown) => {
	const n = Number(value);
	return Number.isFinite(n) ? n : 0;
};

function setProcess(patch: Partial<EgressControl['process']>) {
	emit('update:control', { ...settings.value, process: { ...settings.value.process, ...patch } }, false);
}

function setLimits(patch: Partial<EgressControl['limits']>) {
	emit('update:control', { ...settings.value, limits: { ...settings.value.limits, ...patch } }, false);
}

function setSource(source: string) {
	emit('update:control', { ...settings.value, source: { ...settings.value.source, source } }, false);
}

const sourceItems = computed(() => {
	const available = props.sources ?? [];
	return [
		{ label: 'HLS (memfs)', value: 'hls+memfs' },
		{ label: 'HLS (diskfs)', value: 'hls+diskfs' },
		{ label: 'RTMP', value: 'rtmp' },
		{ label: 'SRT', value: 'srt' },
	].map((item) => ({ ...item, disabled: !available.includes(item.value) }));
});
</script>

<template>
	<UFormField v-if="section === 'source'" :label="$t('Source')" :help="$t('Stream source for publication service (experimental).')">
		<USelect :model-value="settings.source.source" :items="sourceItems" class="w-full" @update:model-value="(v) => setSource(String(v))" />
	</UFormField>

	<div v-else class="space-y-8">
		<section class="space-y-4">
			<h3 class="font-medium text-highlighted">{{ $t('Process') }}</h3>

			<div class="flex flex-wrap gap-x-8 gap-y-3">
				<UCheckbox
					:model-value="settings.process.reconnect"
					:label="$t('Reconnect')"
					@update:model-value="(v) => setProcess({ reconnect: v === true })"
				/>
				<UCheckbox
					:model-value="settings.process.low_delay === true"
					:label="$t('Low latency (Buffer)')"
					@update:model-value="(v) => setProcess({ low_delay: v === true })"
				/>
			</div>

			<div class="grid gap-4 sm:grid-cols-2">
				<UFormField :label="$t('Reconnect delay (seconds)')" :help="$t('Seconds until a process is restarted.')">
					<UInput
						type="number"
						:model-value="settings.process.delay"
						:disabled="!settings.process.reconnect"
						class="w-full"
						@update:model-value="(v) => setProcess({ delay: toNumber(v) })"
					/>
				</UFormField>
				<UFormField :label="$t('Stale timeout (seconds)')" :help="$t('Seconds until a staled process is terminated.')">
					<UInput
						type="number"
						:model-value="settings.process.staleTimeout"
						class="w-full"
						@update:model-value="(v) => setProcess({ staleTimeout: toNumber(v) })"
					/>
				</UFormField>
			</div>
		</section>

		<section class="space-y-4">
			<h3 class="font-medium text-highlighted">{{ $t('Limits') }}</h3>

			<div class="grid gap-4 sm:grid-cols-3">
				<UFormField :label="$t('CPU Limit (percent)')" :help="$t('CPU usage limit in percent (0-100%), 0 for unlimited.')">
					<UInput
						type="number"
						min="0"
						max="100"
						:model-value="settings.limits.cpu_usage"
						class="w-full"
						@update:model-value="(v) => setLimits({ cpu_usage: toNumber(v) })"
					/>
				</UFormField>
				<UFormField :label="$t('Memory Limit (megabytes)')" :help="$t('Memory usage limit in megabytes, 0 for unlimited.')">
					<UInput
						type="number"
						min="0"
						:model-value="settings.limits.memory_mbytes"
						class="w-full"
						@update:model-value="(v) => setLimits({ memory_mbytes: toNumber(v) })"
					/>
				</UFormField>
				<UFormField :label="$t('Threshold (seconds)')" :help="$t('Number of seconds the limits are allowed to be exceeded.')">
					<UInput
						type="number"
						min="0"
						:model-value="settings.limits.waitfor_seconds"
						class="w-full"
						@update:model-value="(v) => setLimits({ waitfor_seconds: toNumber(v) })"
					/>
				</UFormField>
			</div>
		</section>
	</div>
</template>
