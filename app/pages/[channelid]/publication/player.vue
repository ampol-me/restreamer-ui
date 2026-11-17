<script setup lang="ts">
import type { IngestMetadata } from '#shared/metadata';
import type { ChannelAddressKind, CoreClient, ProcessStateName } from '#shared/core/types';
import type { PlayerClient } from '#shared/core/types.player';
import { logoPositions, prepareUrl, resetLogo, type PlayerSettings } from '#shared/player/settings';
import { logoImageTypes, posterImageTypes, type UploadError } from '#shared/player/upload';

// Settings of the channel's public player: embed codes, logo, poster and playback options, with a
// live preview. Saving stores them in the ingest metadata and regenerates the player files on the core.
const route = useRoute();
const { t } = useI18n();
const toast = useToast();

// useRestreamer() is a composable: resolve it during setup, call the client later.
const { api } = useRestreamer();
const client = () => api() as unknown as CoreClient & PlayerClient;
const channelid = computed(() => String(route.params.channelid));

const ready = ref(false);
const state = ref<ProcessStateName>('disconnected');
const metadata = ref<Partial<IngestMetadata>>({});
const settings = ref<PlayerSettings>(client().InitPlayerSettings());
const tab = ref('embed');
const saving = ref(false);
const uploadError = ref<{ open: boolean; title: string; error: UploadError | null }>({ open: false, title: '', error: null });

const tabs = computed(() => [
	{ label: t('Embed'), value: 'embed', slot: 'embed' as const },
	{ label: t('Logo'), value: 'logo', slot: 'logo' as const },
	{ label: t('Poster'), value: 'poster', slot: 'poster' as const },
	{ label: t('Playback'), value: 'playback', slot: 'playback' as const },
]);

async function mount() {
	const id = channelid.value;
	const selected = client().SelectChannel(id);
	if (selected === '' || selected !== id) {
		await navigateTo('/', { replace: true });
		return;
	}

	const proc = await client().GetIngest(id, ['state', 'metadata']);
	if (proc === null) {
		toast.add({ title: t('Main channel not found'), color: 'warning' });
		await navigateTo(`/${id}/`, { replace: true });
		return;
	}

	metadata.value = proc.metadata;
	state.value = proc.progress.state;
	settings.value = client().InitPlayerSettings(proc.metadata.player);
	refreshPreview();

	ready.value = true;
}

onMounted(mount);

const storage = computed<'memfs' | 'diskfs'>(() => (metadata.value.control?.hls?.storage === 'diskfs' ? 'diskfs' : 'memfs'));
const manifest = computed(() => client().GetChannelAddress(`hls+${storage.value}` as ChannelAddressKind, channelid.value));
const playerAddress = computed(() => client().GetPublicAddress('player', channelid.value));
const iframeCode = computed(() => client().GetPublicIframeCode(channelid.value));

// What the preview shows. It lags the form by half a second, so the player is not rebuilt (and the
// images are not refetched) on every keystroke.
const preview = ref({ revision: 0, poster: '', autoplay: false, logo: { ...settings.value.logo } });
let previewTimer: ReturnType<typeof setTimeout> | null = null;

function refreshPreview() {
	const address = client().Address();
	preview.value = {
		revision: preview.value.revision + 1,
		poster: settings.value.poster
			? prepareUrl(settings.value.poster, address)
			: client().GetChannelAddress(`snapshot+${storage.value}` as ChannelAddressKind, channelid.value),
		autoplay: settings.value.autoplay,
		logo: { ...settings.value.logo, image: prepareUrl(settings.value.logo.image, address) },
	};
}

watch(
	settings,
	() => {
		if (previewTimer) clearTimeout(previewTimer);
		previewTimer = setTimeout(refreshPreview, 500);
	},
	{ deep: true },
);

onBeforeUnmount(() => {
	if (previewTimer) clearTimeout(previewTimer);
});

async function uploadLogo(data: ArrayBuffer, extension: string) {
	try {
		settings.value.logo.image = await client().UploadLogo(channelid.value, data, extension);
	} finally {
		saving.value = false;
	}
}

async function uploadPoster(data: ArrayBuffer, extension: string) {
	try {
		settings.value.poster = await client().UploadPoster(channelid.value, data, extension);
	} finally {
		saving.value = false;
	}
}

function showUploadError(title: string, error: UploadError) {
	saving.value = false;
	uploadError.value = { open: true, title, error };
}

// The files stay on the core: they may be used elsewhere, only the reference is dropped.
function resetLogoSettings() {
	settings.value = resetLogo(settings.value);
}

function resetPoster() {
	settings.value.poster = '';
}

async function save() {
	saving.value = true;
	try {
		await client().SetIngestMetadata(channelid.value, { ...metadata.value, player: settings.value });
		await client().UpdatePlayer(channelid.value);
		toast.add({ title: t('Player settings saved'), color: 'success' });
	} finally {
		saving.value = false;
	}
}

async function close() {
	await navigateTo(`/${channelid.value}/`);
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="$t('EDIT: Player')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="$t('Close')" @click="close" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<div v-else class="mx-auto w-full max-w-4xl space-y-6">
				<div v-if="state !== 'connected'" class="flex aspect-video items-center justify-center rounded-lg bg-black text-lg text-white">
					{{ $t('No video') }}
				</div>
				<PlayerPreview v-else :key="preview.revision" :src="manifest" :poster="preview.poster" :autoplay="preview.autoplay" :logo="preview.logo" />

				<ViewerChannelLink :channelid="channelid" />

				<UTabs v-model="tab" :items="tabs" class="w-full">
					<template #embed>
						<div class="space-y-4 pt-2">
							<PlayerCopyField :label="$t('Player URL')" :value="playerAddress" />
							<PlayerCopyField :label="$t('iframe code')" :value="iframeCode" />
						</div>
					</template>

					<template #logo>
						<div class="grid gap-4 pt-2 md:grid-cols-12">
							<UFormField :label="$t('Image URL')" class="md:col-span-9">
								<UInput v-model="settings.logo.image" class="w-full" />
							</UFormField>
							<div class="flex items-end md:col-span-3">
								<PlayerUploadButton
									:label="$t('Upload')"
									:accept-types="logoImageTypes"
									@start="saving = true"
									@error="(error) => showUploadError($t('Uploading the logo failed'), error)"
									@upload="uploadLogo"
								/>
							</div>
							<UFormField :label="$t('Position')" class="md:col-span-4">
								<USelect v-model="settings.logo.position" :items="logoPositions" class="w-full" />
							</UFormField>
							<UFormField :label="$t('Link')" class="md:col-span-8">
								<UInput v-model="settings.logo.link" class="w-full" />
							</UFormField>
						</div>
					</template>

					<template #poster>
						<div class="grid gap-4 pt-2 md:grid-cols-12">
							<UFormField :label="$t('Poster image URL')" class="md:col-span-9">
								<UInput v-model="settings.poster" class="w-full" />
							</UFormField>
							<div class="flex items-end md:col-span-3">
								<PlayerUploadButton
									:label="$t('Upload')"
									:accept-types="posterImageTypes"
									@start="saving = true"
									@error="(error) => showUploadError($t('Uploading the poster failed'), error)"
									@upload="uploadPoster"
								/>
							</div>
						</div>
					</template>

					<template #playback>
						<div class="space-y-3 pt-2">
							<UCheckbox v-model="settings.autoplay" :label="$t('Autoplay')" />
							<UCheckbox v-model="settings.mute" :label="$t('Mute')" />
							<UCheckbox v-model="settings.chromecast" :label="$t('Chromecast')" />
							<UCheckbox v-model="settings.airplay" :label="$t('AirPlay')" />
						</div>
					</template>
				</UTabs>

				<div class="flex flex-wrap items-center gap-2 border-t border-default pt-4">
					<UButton color="neutral" variant="outline" :label="$t('Close')" @click="close" />
					<span class="grow" />
					<UButton
						v-if="settings.logo.image && tab === 'logo'"
						color="error"
						variant="outline"
						:label="$t('Reset logo')"
						@click="resetLogoSettings"
					/>
					<UButton v-if="settings.poster && tab === 'poster'" color="error" variant="outline" :label="$t('Reset poster')" @click="resetPoster" />
					<UButton :label="$t('Save')" :loading="saving" @click="save" />
				</div>
			</div>

			<PlayerBusy :active="saving" />
			<PlayerUploadError v-model:open="uploadError.open" :title="uploadError.title" :error="uploadError.error" />
		</template>
	</UDashboardPanel>
</template>
