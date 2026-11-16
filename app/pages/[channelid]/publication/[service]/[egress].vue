<script setup lang="ts">
import services, { type Service } from '#shared/services';
import * as M from '#shared/metadata';
import type { EgressMetadata } from '#shared/metadata';
import * as helper from '#shared/publication/helper';
import { describeChannel, type PublicationChannel } from '#shared/publication/channel';
import { emptyProgress, type ProcessProgress } from '#shared/core/types';
import type { CoreSkills, PublicationCoreClient, ServiceSkills } from '#shared/core/types.publication';

// Edit a publication of a channel: its service form, encoding and process control, and the process itself.
const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { api } = useRestreamer();

const client = () => api() as unknown as PublicationCoreClient;

const channelid = computed(() => String(route.params.channelid));
const serviceId = computed(() => String(route.params.service));
// The file cannot be called [index].vue after the legacy `:index` parameter: Nuxt reads that as the index route.
const id = computed(() => client().GetEgressId(serviceId.value, String(route.params.egress)));

const ready = ref(false);
const saving = ref(false);
const unsaved = ref(false);
const progress = ref<ProcessProgress>(emptyProgress());

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the registry hands services out with their settings type erased
const service = ref<Service<any> | null>(null);
const skills = ref<CoreSkills | null>(null);
const serviceSkills = ref<ServiceSkills | null>(null);
const channel = ref<PublicationChannel>({ metadata: { name: '', description: '', license: '' }, localSources: [], sources: [] });
const settings = ref<EgressMetadata>(M.getDefaultEgressMetadata());

const deleteOpen = ref(false);
const detailsOpen = ref(false);
const reportOpen = ref(false);

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

// Set once the page is on its way out (unknown channel or publication, or it was just deleted), so that
// a poll that is still under way does not report the publication as missing.
let leaving = false;

async function leave(to: string) {
	leaving = true;
	await navigateTo(to, { replace: true });
}

async function notFound() {
	toast.add({ title: t('Publication service not found'), color: 'warning' });
	await leave(`/${channelid.value}`);
}

async function load(): Promise<boolean> {
	const found = services.Get(serviceId.value);
	if (found === null) {
		await notFound();
		return false;
	}

	const coreSkills = client().Skills();
	const conflated = helper.conflateServiceSkills(found.requires, coreSkills);

	const ingest = await client().GetIngestMetadata(channelid.value);
	const described = describeChannel(ingest);

	const data = await client().GetEgressMetadata(channelid.value, id.value);
	const profile = data.profiles[0];
	if (conflated === null || !profile) {
		await notFound();
		return false;
	}

	profile.video = helper.preselectProfile(profile.video, 'video', ingest.streams, conflated.codecs.video, coreSkills);
	profile.audio = helper.preselectProfile(profile.audio, 'audio', ingest.streams, conflated.codecs.audio, coreSkills);
	data.streams = M.createOutputStreams(clone(described.sources), data.profiles, false);

	service.value = found;
	skills.value = coreSkills;
	serviceSkills.value = conflated;
	channel.value = described;
	settings.value = data;

	return true;
}

usePolling(async () => {
	if (leaving) {
		return;
	}

	const selected = client().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await leave('/');
		return;
	}

	const proc = await client().GetEgress(channelid.value, id.value, ['state']);
	if (leaving) {
		return;
	}
	if (!proc) {
		await notFound();
		return;
	}

	progress.value = proc.progress;

	if (!ready.value) {
		ready.value = await load();
	}
}, 1000);

const title = computed(() => (settings.value.name.length === 0 ? (service.value?.name ?? '') : settings.value.name));

function onSettings(next: EgressMetadata, automatic: boolean) {
	settings.value = next;
	if (!automatic) {
		unsaved.value = true;
	}
}

async function onAction(action: 'connect' | 'disconnect' | 'reconnect') {
	if (action === 'connect') {
		await client().StartEgress(channelid.value, id.value);
	} else if (action === 'disconnect') {
		await client().StopEgress(channelid.value, id.value);
	} else {
		await client().StopEgress(channelid.value, id.value);
		await client().StartEgress(channelid.value, id.value);
	}

	// Shown until the next poll tells what the process really does.
	progress.value = { ...progress.value, state: action === 'disconnect' ? 'disconnecting' : 'connecting' };
}

async function save() {
	saving.value = true;
	try {
		// The core client and createInputsOutputs() change what they are given; the form keeps its own.
		const data = clone(settings.value);

		const [global, inputs, outputs] = helper.createInputsOutputs(clone(channel.value.sources), data.profiles, data.outputs, false);
		if (inputs.length === 0 || outputs.length === 0) {
			toast.add({ title: t('The input profile is not complete. Please define a video and audio source.'), color: 'error' });
			return;
		}

		const result = await client().UpdateEgress(channelid.value, id.value, global, inputs, outputs, data.control);
		if (result === null) {
			await notFound();
			return;
		}

		const err = result[1];
		if (err !== null) {
			toast.add({ title: t('Failed to store publication service ({0})', [err.message]), color: 'error' });
			return;
		}

		await client().SetEgressMetadata(channelid.value, id.value, data);

		toast.add({ title: t('The settings for "{0}" have been saved', [data.name]), color: 'success' });
		unsaved.value = false;
	} finally {
		saving.value = false;
	}
}

async function deletePublication() {
	saving.value = true;
	leaving = true;
	try {
		const name = settings.value.name;

		if ((await client().DeleteEgress(channelid.value, id.value)) === false) {
			leaving = false;
			toast.add({ title: t('The publication service "{0}" could not be deleted', [name]), color: 'warning' });
			return;
		}

		deleteOpen.value = false;
		toast.add({ title: t('The publication service "{0}" has been deleted', [name]), color: 'success' });
		await navigateTo(`/${channelid.value}`);
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="ready ? $t('Edit: {title}', { title }) : ''">
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
					<UButton icon="i-lucide-save" :label="$t('Save')" :loading="saving" :disabled="!ready || !unsaved" @click="save" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready || !service || !skills || !serviceSkills" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<PublicationEditor
				v-else
				class="mx-auto w-full max-w-3xl"
				mode="edit"
				:service="service"
				:settings="settings"
				:sources="channel.sources"
				:local-sources="channel.localSources"
				:skills="skills"
				:service-skills="serviceSkills"
				:metadata="channel.metadata"
				@update:settings="onSettings"
			>
				<template #process>
					<UAlert
						v-if="unsaved"
						color="neutral"
						variant="subtle"
						icon="i-lucide-info"
						:title="$t('You have unsaved changes. Please save them before you can control the service again.')"
					/>
					<section v-else class="space-y-3">
						<PublicationProcessState :progress="progress" @action="onAction" />
						<div class="flex justify-end gap-4 text-sm">
							<UButton color="neutral" variant="link" :label="$t('Process details')" @click="detailsOpen = true" />
							<UButton color="neutral" variant="link" :label="$t('Process report')" @click="reportOpen = true" />
						</div>
					</section>
				</template>
			</PublicationEditor>

			<ChannelProcessDetails
				v-model:open="detailsOpen"
				:title="$t('Process details')"
				:progress="progress"
				:load-log="() => client().GetEgressLog(channelid, id)"
			/>
			<ChannelProcessReport
				v-model:open="reportOpen"
				:title="$t('Process report')"
				:load="() => client().GetEgressDebug(channelid, id)"
				:filename="`restreamer-${channelid}-${serviceId}-report.json`"
			/>

			<UModal v-model:open="deleteOpen" :title="$t('Do you want to delete {title}?', { title })">
				<template #body>
					<p>{{ $t('Deleting a publication service cannot be reversed. The publication stops immediately.') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="deleteOpen = false" />
					<UButton color="error" icon="i-lucide-trash-2" :loading="saving" :label="$t('Delete')" @click="deletePublication" />
				</template>
			</UModal>
		</template>
	</UDashboardPanel>
</template>
