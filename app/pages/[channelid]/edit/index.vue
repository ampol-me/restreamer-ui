<script setup lang="ts">
import { saveIngest, outputVideoCodec, type IngestSaveProblem } from '#shared/ingest/save';
import {
	createOutputStreams,
	getDefaultIngestMetadata,
	validateProfile,
	type IngestMetadata,
	type MetadataIO,
	type MetadataProfile,
	type MetadataSource,
} from '#shared/metadata';
import { emptyProgress, type CoreActiveConfig, type CoreSkills, type ProbeResult, type ProcessProgress } from '#shared/core/types';
import Sources from '#shared/sources';

// Editor of a channel on one page: name, picture and sound first; outputs, author and license folded away.
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
const skills = ref<CoreSkills | null>(null);
const complete = ref(false);
// Which half of the source/encoding editor is open (null = the summary is shown).
const editing = ref<'video' | 'audio' | null>(null);

const deleteOpen = ref(false);
// The sources cannot be changed while the ingest runs; this asks to disconnect first.
const disconnectFor = ref<'wizard' | 'video' | 'audio' | null>(null);

// Everything most people never touch is folded away below the basics. `?tab=<section>` (links
// from other pages, and the old tab addresses) opens the page with that section unfolded.
const advanced = computed(() => [
	{ label: t('Outputs and processing'), icon: 'i-lucide-sliders-horizontal', value: 'control', slot: 'control' as const },
	{ label: t('Author'), icon: 'i-lucide-user-round', value: 'meta', slot: 'meta' as const },
	{ label: t('License'), icon: 'i-lucide-scale', value: 'license', slot: 'license' as const },
]);
const openSections = ref<string[]>(typeof route.query.tab === 'string' && ['control', 'meta', 'license'].includes(route.query.tab) ? [route.query.tab] : []);

const setMeta = (values: Partial<IngestMetadata['meta']>) => (data.value.meta = { ...data.value.meta, ...values });

const sourceName = (type: string) => Sources.Get(type)?.name ?? type;

onMounted(async () => {
	const selected = api().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await navigateTo('/', { replace: true });
		return;
	}

	process.value = await api().GetIngestProgress(channelid.value);
	data.value = { ...getDefaultIngestMetadata(), ...(await api().GetIngestMetadata(channelid.value)) };
	coreConfig.value = api().ConfigActive();
	skills.value = api().Skills();
	complete.value = data.value.profiles.length > 0 && validateProfile(data.value.sources, data.value.profiles[0]) === true;

	// A channel without sources starts in the editor, like legacy.
	if (data.value.sources.length === 0) {
		editing.value = 'video';
	}

	ready.value = true;
});

const title = computed(() => data.value.meta.name || t('Main Source'));
const profile = computed(() => data.value.profiles[0]);
const videoCodec = computed(() => (complete.value ? outputVideoCodec(data.value) : ''));

// The sources cannot be changed while the ingest runs.
function open(target: 'wizard' | 'video' | 'audio') {
	if (process.value.order === 'start') {
		disconnectFor.value = target;
		return;
	}
	proceed(target);
}

function proceed(target: 'wizard' | 'video' | 'audio') {
	if (target === 'wizard') {
		void navigateTo(`/${channelid.value}/edit/wizard`);
	} else {
		editing.value = target;
	}
}

async function disconnectAndContinue() {
	const target = disconnectFor.value;
	const stopped = (await api().StopIngest(channelid.value)) && (await api().StopIngestSnapshot(channelid.value));
	disconnectFor.value = null;

	if (!stopped) {
		toast.add({ title: t('Failed to stop process'), color: 'error' });
		return;
	}

	process.value = await api().GetIngestProgress(channelid.value);
	if (target) proceed(target);
}

async function probeSource(inputs: MetadataIO[]): Promise<ProbeResult> {
	const [result, error] = await api().Probe(channelid.value, inputs);
	return error === null && result ? result : { streams: [], log: [error?.message ?? ''] };
}

async function refreshSkills() {
	await api().RefreshSkills();
	skills.value = api().Skills();
}

async function storeFile(name: string, data: ArrayBuffer): Promise<string> {
	return await api().UploadData('', name, data);
}

function onEditorDone(sources: MetadataSource[], newProfile: MetadataProfile) {
	complete.value = validateProfile(sources, newProfile) === true;
	data.value = {
		...data.value,
		sources,
		profiles: [newProfile],
		streams: complete.value ? createOutputStreams(sources, [newProfile]) : [],
	};
	editing.value = null;
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
					<UButton icon="i-lucide-save" :label="$t('Save')" :loading="saving" :disabled="!ready || !complete || editing !== null" @click="save" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<div v-else class="mx-auto w-full max-w-3xl space-y-8">
				<ChannelProfileEditor
					v-if="editing && skills && coreConfig"
					:sources="data.sources"
					:profile="profile"
					:skills="skills"
					:config="coreConfig.source"
					:start-with="editing"
					:probe="probeSource"
					:refresh="refreshSkills"
					:store="storeFile"
					@done="onEditorDone"
					@abort="editing = null"
				/>

				<template v-else>
					<section class="space-y-4">
						<h2 class="ph-label text-muted">{{ $t('Channel') }}</h2>
						<UFormField :label="$t('Name')">
							<UInput :model-value="data.meta.name" class="w-full" maxlength="200" @update:model-value="(v) => setMeta({ name: String(v) })" />
						</UFormField>
						<UFormField :label="$t('Description')" :hint="$t('Optional')">
							<UTextarea
								:model-value="data.meta.description"
								:rows="3"
								class="w-full"
								@update:model-value="(v) => setMeta({ description: String(v) })"
							/>
						</UFormField>
					</section>

					<section class="space-y-4">
						<div class="flex flex-wrap items-center justify-between gap-2">
							<h2 class="ph-label text-muted">{{ $t('Picture and sound') }}</h2>
							<UButton
								size="sm"
								color="neutral"
								variant="link"
								icon="i-lucide-wand-sparkles"
								:label="$t('Set up again with the wizard')"
								@click="open('wizard')"
							/>
						</div>

						<UAlert
							v-if="!complete"
							color="warning"
							variant="subtle"
							icon="i-lucide-triangle-alert"
							:title="$t('The input profile is not complete. Please define a video and audio source.')"
						/>

						<div v-for="type in ['video', 'audio'] as const" :key="type" class="rounded-lg border border-default bg-elevated p-4">
							<div class="mb-2 flex items-center justify-between gap-2">
								<h3 class="font-semibold text-highlighted">{{ type === 'video' ? $t('Picture') : $t('Sound') }}</h3>
								<UButton size="sm" color="neutral" variant="outline" icon="i-lucide-pencil" :label="$t('Change')" @click="open(type)" />
							</div>
							<ChannelTrackSummary v-if="profile" :type="type" :sources="data.sources" :track="profile[type]" :source-name="sourceName" />
						</div>
					</section>

					<section class="space-y-2">
						<h2 class="ph-label text-muted">{{ $t('Advanced') }}</h2>
						<UAccordion v-model="openSections" type="multiple" :items="advanced">
							<template #control>
								<div class="pb-4">
									<ChannelControls
										v-model="data.control"
										:rtmp-available="coreConfig?.source.network.rtmp.enabled === true"
										:srt-available="coreConfig?.source.network.srt.enabled === true"
										:video-codec="videoCodec"
									/>
								</div>
							</template>

							<template #meta>
								<div class="space-y-4 pb-4">
									<UFormField :label="$t('Name')">
										<UInput
											:model-value="data.meta.author.name"
											class="w-full"
											maxlength="200"
											@update:model-value="(v) => setMeta({ author: { ...data.meta.author, name: String(v) } })"
										/>
									</UFormField>
									<UFormField :label="$t('Description')">
										<UTextarea
											:model-value="data.meta.author.description"
											:rows="3"
											class="w-full"
											@update:model-value="(v) => setMeta({ author: { ...data.meta.author, description: String(v) } })"
										/>
									</UFormField>
								</div>
							</template>

							<template #license>
								<div class="space-y-4 pb-4">
									<p class="text-sm text-muted">{{ $t('What others are allowed to do with your stream. Shown on the player.') }}</p>
									<ChannelLicenseForm v-model="data.license" />
								</div>
							</template>
						</UAccordion>
					</section>
				</template>
			</div>

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
