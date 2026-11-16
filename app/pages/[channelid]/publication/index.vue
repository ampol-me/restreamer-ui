<script setup lang="ts">
import services from '#shared/services';
import * as M from '#shared/metadata';
import type { EgressMetadata } from '#shared/metadata';
import * as helper from '#shared/publication/helper';
import { describeChannel, type PublicationChannel } from '#shared/publication/channel';
import type { CoreSkills, PublicationCoreClient } from '#shared/core/types.publication';

// Add a publication to a channel: pick a service, then fill in its form, encoding and process control.
const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { api } = useRestreamer();

const client = () => api() as unknown as PublicationCoreClient;

const channelid = computed(() => String(route.params.channelid));

const ready = ref(false);
const saving = ref(false);
const skills = ref<CoreSkills | null>(null);
const channel = ref<PublicationChannel>({ metadata: { name: '', description: '', license: '' }, localSources: [], sources: [] });

const filter = ref('all');
const filters = computed(() => [
	{ label: t('All'), value: 'all' },
	{ label: t('Platforms'), value: 'platform' },
	{ label: t('Software'), value: 'software' },
	{ label: t('Protocols'), value: 'universal' },
]);

// '' while the service is still to be picked.
const serviceId = ref('');
const settings = ref<EgressMetadata>(M.initEgressMetadata({}));

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

onMounted(async () => {
	const selected = client().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await navigateTo('/', { replace: true });
		return;
	}

	skills.value = client().Skills();
	channel.value = describeChannel(await client().GetIngestMetadata(channelid.value));

	ready.value = true;
});

const offered = computed(() =>
	services
		.List()
		.filter((s) => filter.value === 'all' || s.category === filter.value)
		.map((s) => ({ service: s, compatible: helper.checkServiceRequirements(s.requires, skills.value) })),
);

const service = computed(() => (serviceId.value === '' ? null : services.Get(serviceId.value)));
const serviceSkills = computed(() => (service.value ? helper.conflateServiceSkills(service.value.requires, skills.value) : null));

function selectService(id: string) {
	const picked = services.Get(id);
	if (picked === null || skills.value === null) {
		return;
	}

	const codecs = helper.conflateServiceSkills(picked.requires, skills.value)?.codecs;
	const streams = channel.value.sources[0]?.streams ?? [];

	// Every pick starts from an empty publication, whatever was entered for a service picked before.
	const fresh: EgressMetadata = M.initEgressMetadata({});
	const profile = fresh.profiles[0];
	if (!codecs || !profile) {
		return;
	}

	profile.video = helper.preselectProfile(profile.video, 'video', streams, codecs.video, skills.value);
	profile.audio = helper.preselectProfile(profile.audio, 'audio', streams, codecs.audio, skills.value);

	fresh.name = picked.name;
	fresh.streams = M.createOutputStreams(clone(channel.value.sources), fresh.profiles, false);

	settings.value = fresh;
	serviceId.value = id;
}

function back() {
	serviceId.value = '';
	settings.value = M.initEgressMetadata({});
}

async function save() {
	saving.value = true;
	try {
		// The core client and createInputsOutputs() change what they are given; the form keeps its own.
		const data = clone(settings.value);

		const [global, inputs, outputs] = helper.createInputsOutputs(clone(channel.value.sources), data.profiles, data.outputs, false);
		if (inputs.length === 0 || outputs.length === 0) {
			toast.add({ title: t('The input profile is not complete. Please define a video and/or audio source.'), color: 'error' });
			return;
		}

		const [id, err] = await client().CreateEgress(channelid.value, serviceId.value, global, inputs, outputs, data.control);
		if (err !== null) {
			toast.add({ title: t('Failed to create publication service ({0})', [err.message]), color: 'error' });
			return;
		}

		await client().SetEgressMetadata(channelid.value, id, data);

		toast.add({
			title: data.name.length !== 0 ? t('The publication service "{0}" has been created', [data.name]) : t('The publication service has been created'),
			color: 'success',
		});

		await navigateTo(`/${channelid.value}`);
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="service ? $t('Add: {0}', [service.name]) : $t('Add Publication')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton color="neutral" variant="ghost" :label="$t('Close')" :to="`/${channelid}`" />
					<template v-if="service">
						<UButton color="neutral" variant="subtle" icon="i-lucide-arrow-left" :label="$t('Back')" :disabled="saving" @click="back" />
						<UButton icon="i-lucide-save" :label="$t('Save')" :loading="saving" @click="save" />
					</template>
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<div v-else-if="!service" class="mx-auto w-full max-w-4xl space-y-6">
				<div class="flex justify-center">
					<UTabs v-model="filter" :items="filters" :content="false" variant="pill" color="neutral" />
				</div>

				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
					<li v-for="{ service: s, compatible } in offered" :key="s.id">
						<UButton v-if="compatible" block color="neutral" variant="subtle" class="h-full flex-col gap-2 py-5" @click="selectService(s.id)">
							<PublicationServiceIcon :icon="s.icon" class="size-10" />
							<span class="text-center text-sm">{{ s.name }}</span>
						</UButton>
						<UTooltip v-else :text="`${$t('Incompatible')}: ${$t('Check the requirements')}`">
							<!-- A disabled button swallows the hover the tooltip listens for. -->
							<span class="block h-full">
								<UButton block color="neutral" variant="subtle" class="h-full flex-col gap-2 py-5" disabled>
									<PublicationServiceIcon :icon="s.icon" class="size-10" />
									<span class="text-center text-sm">{{ s.name }}</span>
								</UButton>
							</span>
						</UTooltip>
					</li>
				</ul>
			</div>

			<PublicationEditor
				v-else-if="skills && serviceSkills"
				:key="service.id"
				class="mx-auto w-full max-w-3xl"
				mode="add"
				:service="service"
				:settings="settings"
				:sources="channel.sources"
				:local-sources="channel.localSources"
				:skills="skills"
				:service-skills="serviceSkills"
				:metadata="channel.metadata"
				@update:settings="(next) => (settings = next)"
			/>
		</template>
	</UDashboardPanel>
</template>
