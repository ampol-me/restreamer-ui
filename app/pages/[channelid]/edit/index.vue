<script setup lang="ts">
import { saveIngest, outputVideoCodec, type IngestSaveProblem } from '#shared/ingest/save';
import { getDefaultIngestMetadata, validateProfile, type IngestMetadata } from '#shared/metadata';
import { emptyProgress, type CoreActiveConfig, type ProcessProgress } from '#shared/core/types';

// Editor of a channel: sources and encoding, processing & control, meta information, license.
const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { api, sync } = useRestreamer();

const channelid = computed(() => String(route.params.channelid));

const ready = ref(false);
const saving = ref(false);
const data = ref<IngestMetadata>(getDefaultIngestMetadata());
const process = ref<ProcessProgress>(emptyProgress());
const coreConfig = ref<CoreActiveConfig | null>(null);
const complete = ref(false);

const tab = ref(typeof route.query.tab === 'string' ? route.query.tab : 'general');
const deleteOpen = ref(false);
// The sources cannot be changed while the ingest runs; this asks to disconnect first.
const disconnectFor = ref<'wizard' | null>(null);

const tabs = computed(() => [
	{ label: t('General'), value: 'general', slot: 'general' as const },
	{ label: t('Processing & Control'), value: 'control', slot: 'control' as const },
	{ label: t('Meta information'), value: 'meta', slot: 'meta' as const },
	{ label: t('License'), value: 'license', slot: 'license' as const },
]);

// Names of the source types as the sources registry has them (legacy Edit/Sources/*).
const sourceNames: Record<string, string> = {
	network: 'Network source',
	alsa: 'Hardware device',
	avfoundation: 'Hardware device',
	video4linux2: 'Hardware device',
	raspicam: 'Raspberry Pi camera',
	virtualaudio: 'Virtual source',
	virtualvideo: 'Virtual source',
	noaudio: 'No audio',
	videoaudio: 'Video source',
	videoloop: 'Loop',
	audioloop: 'Loop',
};
const sourceName = (type: string) => sourceNames[type] ?? type;

onMounted(async () => {
	const selected = api().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await navigateTo('/', { replace: true });
		return;
	}

	process.value = await api().GetIngestProgress(channelid.value);
	data.value = { ...getDefaultIngestMetadata(), ...(await api().GetIngestMetadata(channelid.value)) };
	coreConfig.value = api().ConfigActive();
	complete.value = data.value.profiles.length > 0 && validateProfile(data.value.sources, data.value.profiles[0]) === true;

	ready.value = true;
});

const title = computed(() => data.value.meta.name || t('Main Source'));
const profile = computed(() => data.value.profiles[0]);
const videoCodec = computed(() => (complete.value ? outputVideoCodec(data.value) : ''));

function openWizard() {
	if (process.value.order === 'start') {
		disconnectFor.value = 'wizard';
		return;
	}
	void navigateTo(`/${channelid.value}/edit/wizard`);
}

async function disconnectAndContinue() {
	const stopped = (await api().StopIngest(channelid.value)) && (await api().StopIngestSnapshot(channelid.value));
	disconnectFor.value = null;

	if (!stopped) {
		toast.add({ title: t('Failed to stop process'), color: 'error' });
		return;
	}

	await navigateTo(`/${channelid.value}/edit/wizard`);
}

function describe(problem: IngestSaveProblem): string {
	switch (problem.step) {
		case 'profile':
			return t('The input profile is not complete. Please define a video and audio source.');
		case 'ingest':
			return t('Failed to update ingest process ({0})', [problem.message]);
		case 'metadata':
			return t('Failed to save ingest metadata');
		case 'snapshot':
			return t('Failed to update ingest snapshot process ({0})', [problem.message]);
		case 'player':
			return t('Failed to update the player');
		case 'playersite':
			return t('Failed to update the playersite');
	}
}

async function save() {
	saving.value = true;
	try {
		const result = await saveIngest(api(), channelid.value, data.value);

		for (const problem of result.problems) {
			toast.add({ title: describe(problem), color: result.ok && problem.step !== 'snapshot' ? 'warning' : 'error' });
		}

		if (!result.ok) return;

		sync();
		toast.add({ title: t('Channel "{0}" saved', [data.value.meta.name]), color: 'success' });
		await navigateTo(`/${channelid.value}`);
	} finally {
		saving.value = false;
	}
}

async function deleteChannel() {
	saving.value = true;
	try {
		const name = data.value.meta.name;
		if (!(await api().DeleteChannel(channelid.value))) {
			toast.add({ title: t('The channel "{0}" could not be deleted', [name]), color: 'warning' });
			return;
		}

		deleteOpen.value = false;
		sync();
		toast.add({ title: t('The channel "{0}" has been deleted', [name]), color: 'success' });
		await navigateTo('/');
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="$t('Edit: {title}', { title })">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton color="neutral" variant="ghost" :label="$t('Close')" :to="`/${channelid}`" />
					<UButton
						color="error"
						variant="subtle"
						icon="i-lucide-trash-2"
						:label="$t('Delete')"
						:disabled="!ready || saving"
						@click="deleteOpen = true"
					/>
					<UButton icon="i-lucide-save" :label="$t('Save')" :loading="saving" :disabled="!ready || !complete" @click="save" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<UTabs v-else v-model="tab" :items="tabs" class="mx-auto w-full max-w-3xl">
				<template #general>
					<div class="space-y-6 pt-4">
						<p class="text-sm text-muted">
							{{ $t('Edit the audio and video sources for the live stream. Add a description, and set your desired content license.') }}
						</p>

						<UAlert
							v-if="!complete"
							color="warning"
							variant="subtle"
							icon="i-lucide-triangle-alert"
							:title="$t('The input profile is not complete. Please define a video and audio source.')"
						/>

						<section class="space-y-2">
							<div class="flex items-center justify-between">
								<h3 class="font-medium text-highlighted">{{ $t('Video settings') }}</h3>
								<UButton size="sm" color="neutral" variant="subtle" icon="i-lucide-wand-sparkles" :label="$t('Wizard')" @click="openWizard" />
							</div>
							<ChannelTrackSummary v-if="profile" type="video" :sources="data.sources" :track="profile.video" :source-name="sourceName" />
						</section>

						<section class="space-y-2">
							<h3 class="font-medium text-highlighted">{{ $t('Audio settings') }}</h3>
							<ChannelTrackSummary v-if="profile" type="audio" :sources="data.sources" :track="profile.audio" :source-name="sourceName" />
						</section>
					</div>
				</template>

				<template #control>
					<div class="pt-4">
						<ChannelControls
							v-model="data.control"
							:rtmp-available="coreConfig?.source.network.rtmp.enabled === true"
							:srt-available="coreConfig?.source.network.srt.enabled === true"
							:video-codec="videoCodec"
						/>
					</div>
				</template>

				<template #meta>
					<div class="space-y-4 pt-4">
						<p class="text-sm text-muted">{{ $t('Briefly describe what the audience will see during the live stream.') }}</p>
						<ChannelMetaForm v-model="data.meta" />
					</div>
				</template>

				<template #license>
					<div class="space-y-4 pt-4">
						<p class="text-sm text-muted">
							{{
								$t(
									'Use your copyright and choose the right image licence. Whether free for all or highly restricted. Briefly discuss what others are allowed to do with your image.',
								)
							}}
						</p>
						<ChannelLicenseForm v-model="data.license" />
					</div>
				</template>
			</UTabs>

			<UModal
				:open="disconnectFor !== null"
				:title="$t('Do you want to disconnect &quot;{0}&quot;?', [data.meta.name])"
				@update:open="(open) => !open && (disconnectFor = null)"
			>
				<template #body>
					<p>{{ $t('This source cannot be edited while it is in use. To continue, you have to disconnect the source.') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="disconnectFor = null" />
					<UButton color="error" :label="$t('Disconnect & Continue')" @click="disconnectAndContinue" />
				</template>
			</UModal>

			<UModal v-model:open="deleteOpen" :title="$t('Do you want to delete &quot;{0}&quot;?', [data.meta.name])">
				<template #body>
					<p>{{ $t('The deletion of this channel can not be recovered. All publications of this channel will be removed.') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="deleteOpen = false" />
					<UButton color="error" icon="i-lucide-trash-2" :loading="saving" :label="$t('Delete')" @click="deleteChannel" />
				</template>
			</UModal>
		</template>
	</UDashboardPanel>
</template>
