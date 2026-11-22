<script setup lang="ts">
import services from '#shared/services';
import type { EgressProcess } from '#shared/core/types';
import { formatBitrate } from '~/utils/format';
import { tallyFor } from '~/utils/tally';

// Publications of a channel: viewer/bandwidth totals, the viewer page, and every egress with its switch.
const props = defineProps<{ channelid: string }>();

type Egress = EgressProcess;

const { t } = useI18n();
const toast = useToast();
const { api } = useRestreamer();

const egresses = ref<Egress[]>([]);
const sessions = ref({ viewer: 0, bandwidth: 0 });
const busy = ref<Record<string, boolean>>({});

usePolling(async () => {
	const [processes, current] = await Promise.all([
		api().ListIngestEgresses(props.channelid, services.IDs()),
		api().CurrentSessions(['ffmpeg', 'hls', 'rtmp', 'srt']),
	]);

	egresses.value = processes.map((p) => ({ id: p.id, name: p.name, service: p.service, index: p.index, progress: p.progress }));
	sessions.value = { viewer: current.sessions, bandwidth: current.bitrate_kbit };
}, 1000);

const publications = computed(() => egresses.value.filter((e) => e.service !== 'player'));

const serviceName = (id: string) => services.Get(id)?.name ?? id;
const isOn = (e: Egress) => e.progress.order === 'start';

const tally = (e: Egress) => tallyFor(e.progress.state);

async function toggle(e: Egress, on: boolean) {
	busy.value = { ...busy.value, [e.id]: true };
	try {
		const ok = on ? await api().StartEgress(props.channelid, e.id) : await api().StopEgress(props.channelid, e.id);
		if (!ok) {
			toast.add({ title: t('The publication could not be switched.'), color: 'error' });
		}
	} finally {
		busy.value = { ...busy.value, [e.id]: false };
	}
}
</script>

<template>
	<aside class="space-y-4">
		<div class="flex items-center justify-between">
			<h2 class="font-medium text-highlighted">{{ $t('Publications') }}</h2>
			<UButton icon="i-lucide-plus" size="sm" color="neutral" variant="subtle" :label="$t('Add')" :to="`/${channelid}/publication`" />
		</div>

		<dl class="grid grid-cols-2 gap-3">
			<div class="rounded-lg bg-elevated px-3 py-3 text-center">
				<dd class="font-mono text-2xl font-semibold text-highlighted tabular-nums">{{ sessions.viewer }}</dd>
				<dt class="text-xs text-muted">{{ $t('Viewer') }}</dt>
			</div>
			<div class="rounded-lg bg-elevated px-3 py-3 text-center">
				<dd class="font-mono text-2xl font-semibold text-highlighted tabular-nums">{{ formatBitrate(sessions.bandwidth) }}</dd>
				<dt class="text-xs text-muted">{{ $t('Bandwidth') }}</dt>
			</div>
		</dl>

		<ul class="divide-y divide-default rounded-lg border border-default">
			<li class="flex items-center gap-3 px-3 py-2">
				<UIcon name="i-lucide-monitor-play" class="size-5 shrink-0 text-muted" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm text-highlighted">{{ $t('Viewer page') }}</p>
					<p class="truncate text-xs text-muted">{{ $t('Link, embed code, who can watch') }}</p>
				</div>
				<UButton
					icon="i-lucide-pencil"
					size="sm"
					color="neutral"
					variant="ghost"
					:aria-label="$t('Edit the viewer page')"
					:to="`/${channelid}/viewer`"
				/>
			</li>

			<li v-for="egress in publications" :key="egress.id" class="flex items-center gap-3 px-3 py-2">
				<TallyBadge v-bind="tally(egress)" />
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm text-highlighted">{{ egress.name || serviceName(egress.service) }}</p>
					<p class="truncate text-xs text-muted">{{ serviceName(egress.service) }}</p>
				</div>
				<USwitch
					:model-value="isOn(egress)"
					:loading="busy[egress.id]"
					:disabled="busy[egress.id]"
					:aria-label="$t('Publish to {name}', { name: egress.name || serviceName(egress.service) })"
					@update:model-value="(on) => toggle(egress, on === true)"
				/>
				<UButton
					icon="i-lucide-pencil"
					size="sm"
					color="neutral"
					variant="ghost"
					:aria-label="$t('Edit publication')"
					:to="`/${channelid}/publication/${egress.service}/${egress.index}`"
				/>
			</li>
		</ul>

		<p v-if="publications.length === 0" class="text-sm text-muted">
			{{ $t('No publications yet. Add one to send this channel to YouTube, Facebook, an RTMP server and more.') }}
		</p>
	</aside>
</template>
