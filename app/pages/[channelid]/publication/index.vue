<script setup lang="ts">
import services from '#shared/services';
import * as M from '#shared/metadata';
import type { EgressMetadata } from '#shared/metadata';
import * as helper from '#shared/publication/helper';
import { grouped, popular } from '#shared/publication/picker';
import { describeChannel, type PublicationChannel } from '#shared/publication/channel';
import type { CoreSkills, PublicationCoreClient } from '#shared/core/types.publication';

// Add a publication to a channel: pick where to send it (the usual destinations first, the rest
// searchable), then fill in that service's form.
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

const query = ref('');
const categoryLabels = computed(() => ({ platform: t('Platforms'), software: t('Streaming servers'), universal: t('Other destinations (by protocol)') }));

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
		.map((s) => ({ id: s.id, name: s.name, category: s.category, icon: s.icon, compatible: helper.checkServiceRequirements(s.requires, skills.value) })),
);
const popularOffered = computed(() => (query.value.trim() === '' ? popular(offered.value) : []));
const groups = computed(() => grouped(offered.value, query.value));

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

			<div v-else-if="!service" class="mx-auto w-full max-w-4xl space-y-8">
				<div class="space-y-1">
					<h2 class="text-xl leading-[30px] font-semibold text-highlighted">{{ $t('Where should this channel be sent?') }}</h2>
					<p class="text-sm text-muted">{{ $t('Pick a destination. You can add as many as you like, one at a time.') }}</p>
				</div>

				<UInput
					v-model="query"
					icon="i-lucide-search"
					class="w-full max-w-md"
					:placeholder="$t('Search, e.g. YouTube')"
					:aria-label="$t('Search destinations')"
				/>

				<section v-if="popularOffered.length > 0" class="space-y-3">
					<h3 class="ph-label text-muted">{{ $t('Most used') }}</h3>
					<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3">
						<li v-for="s in popularOffered" :key="s.id">
							<PublicationServiceTile :service="s" large @pick="selectService(s.id)" />
						</li>
					</ul>
				</section>

				<section v-for="group in groups" :key="group.category" class="space-y-3">
					<h3 class="ph-label text-muted">{{ categoryLabels[group.category] }}</h3>
					<ul class="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
						<li v-for="s in group.services" :key="s.id">
							<PublicationServiceTile :service="s" @pick="selectService(s.id)" />
						</li>
					</ul>
				</section>

				<UEmpty
					v-if="groups.length === 0"
					icon="i-lucide-search-x"
					:title="$t('No destination matches your search.')"
					:description="$t('For a service that is not listed, use RTMP with the address and key it gives you.')"
				/>
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
