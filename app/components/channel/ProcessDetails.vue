<script setup lang="ts">
import type { ProcessLog, ProcessProgress } from '#shared/core/types';
import { formatBitrate, formatBytes, formatLogLine, formatUptime } from '~/utils/format';

// Live FFmpeg command, banner and log of one process, refreshed every second while open.
const props = defineProps<{
	title: string;
	progress: ProcessProgress;
	loadLog: () => Promise<ProcessLog | null>;
}>();

const open = defineModel<boolean>('open', { default: false });

const prelude = ref<string[]>([]);
const log = ref<string[]>([]);
const logBox = ref<HTMLElement | null>(null);

let timer: ReturnType<typeof setInterval> | null = null;

async function refresh() {
	const data = await props.loadLog();
	if (!data) return;

	// Keep following the log unless the reader scrolled up.
	const el = logBox.value;
	const follow = !el || el.scrollHeight - el.scrollTop - el.clientHeight < 40;

	prelude.value = (data.prelude ?? []).map(formatLogLine);
	log.value = (data.log ?? []).map(formatLogLine);

	if (follow) {
		await nextTick();
		if (logBox.value) logBox.value.scrollTop = logBox.value.scrollHeight;
	}
}

watch(
	open,
	(isOpen) => {
		if (timer) clearInterval(timer);
		timer = null;
		if (isOpen) {
			void refresh();
			timer = setInterval(refresh, 1000);
		}
	},
	{ immediate: true },
);

onBeforeUnmount(() => {
	if (timer) clearInterval(timer);
});

const command = computed(() => ['ffmpeg', ...(props.progress.command ?? [])].join(' '));

const stats = computed(() => [
	{ label: 'Uptime', value: formatUptime(props.progress.time) },
	{ label: 'CPU', value: `${Number(props.progress.cpu ?? 0).toFixed(2)}%` },
	{ label: 'Memory', value: formatBytes(props.progress.memory) },
	{ label: 'FPS', value: Number(props.progress.fps ?? 0).toFixed(2) },
	{ label: 'Bitrate', value: formatBitrate(props.progress.bitrate) },
	{ label: 'Quality', value: Number(props.progress.q ?? -1).toFixed(2) },
	{ label: 'Speed', value: `${Number(props.progress.speed ?? 0).toFixed(2)}x` },
	{ label: 'Frame drops', value: String(props.progress.drop ?? 0) },
	{ label: 'Dup. frames', value: String(props.progress.dup ?? 0) },
]);

const copy = (text: string) => navigator.clipboard.writeText(text);
</script>

<template>
	<UModal v-model:open="open" :title="title" :ui="{ content: 'sm:max-w-5xl' }">
		<template #body>
			<div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_10rem]">
				<div class="min-w-0 space-y-4">
					<section>
						<div class="mb-1 flex items-center justify-between">
							<h3 class="text-sm font-medium text-highlighted">{{ $t('Command') }}</h3>
							<UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" :aria-label="$t('Copy')" @click="copy(command)" />
						</div>
						<pre class="max-h-24 overflow-auto rounded-md bg-elevated p-2 font-mono text-xs whitespace-pre-wrap break-all">{{ command }}</pre>
					</section>

					<section>
						<div class="mb-1 flex items-center justify-between">
							<h3 class="text-sm font-medium text-highlighted">{{ $t('Banner') }}</h3>
							<UButton
								icon="i-lucide-copy"
								size="xs"
								color="neutral"
								variant="ghost"
								:aria-label="$t('Copy')"
								@click="copy(prelude.join('\n'))"
							/>
						</div>
						<pre class="max-h-40 overflow-auto rounded-md bg-elevated p-2 font-mono text-xs">{{ prelude.join('\n') }}</pre>
					</section>

					<section>
						<div class="mb-1 flex items-center justify-between">
							<h3 class="text-sm font-medium text-highlighted">{{ $t('Logging') }}</h3>
							<UButton icon="i-lucide-copy" size="xs" color="neutral" variant="ghost" :aria-label="$t('Copy')" @click="copy(log.join('\n'))" />
						</div>
						<pre ref="logBox" class="h-64 overflow-auto rounded-md bg-elevated p-2 font-mono text-xs">{{ log.join('\n') }}</pre>
					</section>
				</div>

				<dl class="grid grid-cols-3 gap-3 md:grid-cols-1">
					<div v-for="stat in stats" :key="stat.label">
						<dd class="font-mono text-sm font-semibold text-highlighted tabular-nums">{{ stat.value }}</dd>
						<dt class="text-xs text-muted">{{ $t(stat.label) }}</dt>
					</div>
				</dl>
			</div>
		</template>
	</UModal>
</template>
