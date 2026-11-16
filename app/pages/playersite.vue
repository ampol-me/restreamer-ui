<script setup lang="ts">
import { getDefaultMetadata, type Metadata } from '#shared/metadata';
import type { ChannelSummary, CoreClient } from '#shared/core/types';
import type { PlayerClient } from '#shared/core/types.player';
import { additionalChannelOptions, additionalChannels, mainChannelId, sortChannels, sortTemplates, type PlayersiteSettings } from '#shared/player/settings';
import { playersiteImageTypes, playersiteTemplateTypes, type UploadError } from '#shared/player/upload';

// The publication website ("playersite"): a landing page on the core with the player and a channel
// list. Saving stores the settings in the system metadata and regenerates the site's files.
const { t } = useI18n();
const toast = useToast();

// useRestreamer() is a composable: resolve it during setup, call the client later.
const { api } = useRestreamer();
const client = () => api() as unknown as CoreClient & PlayerClient;

const ready = ref(false);
const available = ref(false);
const data = ref<Metadata>(getDefaultMetadata());
const settings = ref<PlayersiteSettings>(client().InitPlayersiteSettings());
const channels = ref<ChannelSummary[]>([]);
const templates = ref<string[]>([]);
const tab = ref('general');
const saving = ref(false);
const deleteOpen = ref(false);
const uploadError = ref<{ open: boolean; title: string; error: UploadError | null }>({ open: false, title: '', error: null });

const playersiteUrl = computed(() => `${client().Address()}/${client().GetPlayersiteUrl()}`);

async function mount() {
	// Without a video source there is nothing to publish.
	if (!client().HasIngest()) {
		await navigateTo('/');
		return;
	}

	const metadata = await client().GetMetadata();

	data.value = metadata;
	settings.value = client().InitPlayersiteSettings(metadata.playersite);
	channels.value = client().ListChannels();

	templates.value = await client().ListPlayersiteTemplates();
	available.value = await client().HasPlayersite();

	ready.value = true;
}

onMounted(mount);

const enabled = computed(() => settings.value.playersite);

const tabs = computed(() => [
	{ label: t('General'), value: 'general', slot: 'general' as const },
	{ label: t('Template'), value: 'template', slot: 'template' as const, disabled: !enabled.value },
	{ label: t('Design'), value: 'design', slot: 'design' as const, disabled: !enabled.value },
	{ label: t('Notes'), value: 'notes', slot: 'notes' as const, disabled: !enabled.value },
	{ label: t('Code injection'), value: 'code_injection', slot: 'code_injection' as const, disabled: !enabled.value },
]);

const mainId = computed(() => mainChannelId(settings.value.channelid, channels.value, client().GetCurrentChannelID()));

const mainChannelItems = computed(() => [
	{ label: t('Selected channel'), value: 'current' },
	...sortChannels(channels.value).map((c) => ({ label: c.name, value: c.channelid })),
]);

const additionalItems = computed(() => additionalChannelOptions(channels.value, mainId.value).map((c) => ({ label: c.name, value: c.channelid })));

const additional = computed({
	get: () => additionalChannels(settings.value.channel_list, mainId.value),
	set: (ids: string[]) => {
		settings.value.channel_list = ids;
	},
});

const templateItems = computed(() => [
	{ label: t('Default'), value: '!default' },
	...sortTemplates(templates.value).map((name) => ({ label: name, value: name })),
]);

async function uploadBackgroundImage(buffer: ArrayBuffer, extension: string) {
	try {
		settings.value.bgimage_url = await client().UploadPlayersiteBackgroundImage(buffer, extension);
	} finally {
		saving.value = false;
	}
}

async function uploadTemplate(buffer: ArrayBuffer) {
	try {
		const name = await client().UploadPlayersiteTemplate(buffer, settings.value.templatename);

		templates.value = await client().ListPlayersiteTemplates();
		settings.value.template = name;
		settings.value.templatename = '';
	} finally {
		saving.value = false;
	}
}

async function deleteTemplate() {
	deleteOpen.value = false;
	saving.value = true;
	try {
		await client().DeletePlayersiteTemplate(settings.value.template);
		settings.value.template = '!default';
		templates.value = await client().ListPlayersiteTemplates();
	} finally {
		saving.value = false;
	}
}

function showUploadError(error: UploadError) {
	saving.value = false;
	uploadError.value = { open: true, title: t('Uploading the file failed'), error };
}

async function save() {
	saving.value = true;
	try {
		if ((await client().SetMetadata({ ...data.value, playersite: settings.value })) === false) {
			toast.add({ title: t('Failed to store player size setting.'), color: 'error' });
			return;
		}

		if ((await client().UpdatePlayersite()) === false) {
			toast.add({ title: t('Failed to create publication website files.'), color: 'error' });
			return;
		}

		available.value = await client().HasPlayersite();

		toast.add({ title: t('Publication website settings saved'), color: 'success' });
	} finally {
		saving.value = false;
	}
}
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="$t('EDIT: Publication Website')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-x" color="neutral" variant="ghost" :aria-label="$t('Close')" to="/" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<div v-else class="mx-auto w-full max-w-4xl space-y-6">
				<UTabs
					v-model="tab"
					:items="tabs"
					orientation="vertical"
					variant="link"
					class="w-full items-start gap-6 max-md:flex-col"
					:ui="{ list: 'shrink-0 md:w-44', content: 'min-w-0 flex-1' }"
				>
					<template #general>
						<div class="space-y-5">
							<div>
								<h2 class="text-lg font-semibold text-highlighted">{{ $t('General') }}</h2>
								<p class="mt-1 text-sm text-muted">
									{{
										$t(
											'In addition to the player, the Restreamer offers a complete landingpage, which you can use to present your live stream easily and quickly.',
										)
									}}
								</p>
							</div>

							<UCheckbox v-model="settings.playersite" :label="$t('Playersite')" />

							<UFormField :label="$t('Sitename')">
								<UInput v-model="settings.title" class="w-full" :disabled="!enabled" />
							</UFormField>

							<UFormField :label="$t('Main channel')" :help="$t('Main page channel (index.html).')">
								<USelect v-model="settings.channelid" :items="mainChannelItems" class="w-full" :disabled="!enabled" />
							</UFormField>

							<UFormField :label="$t('Additional channels')" :help="$t('Additional channels to display on the playersite.')">
								<USelectMenu
									v-model="additional"
									:items="additionalItems"
									value-key="value"
									multiple
									:search-input="false"
									class="w-full"
									:disabled="!enabled"
								/>
							</UFormField>

							<UCheckbox v-model="settings.share" :label="$t('Share button')" :disabled="!enabled" />
							<UCheckbox v-model="settings.chromecast" :label="$t('Chromecast')" :disabled="!enabled" />
							<UCheckbox v-model="settings.airplay" :label="$t('AirPlay')" :disabled="!enabled" />
							<UCheckbox
								v-model="settings.support"
								:label="$t('Support datarhei Restreamer')"
								:description="$t('Shows a reference to the project.')"
								:disabled="!enabled"
							/>
						</div>
					</template>

					<template #template>
						<div class="space-y-5">
							<h2 class="text-lg font-semibold text-highlighted">{{ $t('Template') }}</h2>

							<h3 class="font-medium text-highlighted">{{ $t('Available') }}</h3>
							<div class="grid gap-4 md:grid-cols-12">
								<UFormField
									:label="$t('Selection')"
									:help="
										$t('Template to be used for creating the publication website. The delete button removes the selection from the system.')
									"
									class="md:col-span-9"
								>
									<USelect v-model="settings.template" :items="templateItems" class="w-full" />
								</UFormField>
								<div class="md:col-span-3 md:pt-6">
									<UButton
										color="error"
										variant="outline"
										icon="i-lucide-trash-2"
										:label="$t('Delete')"
										:disabled="settings.template === '!default'"
										@click="deleteOpen = true"
									/>
								</div>
							</div>

							<USeparator />

							<h3 class="font-medium text-highlighted">{{ $t('Upload') }}</h3>
							<div class="grid gap-4 md:grid-cols-12">
								<UFormField
									:label="$t('Name')"
									:help="$t('Name for the template. If the name already exists, it will be overwritten.')"
									class="md:col-span-9"
								>
									<UInput v-model="settings.templatename" class="w-full" />
								</UFormField>
								<div class="md:col-span-3 md:pt-6">
									<PlayerUploadButton
										:label="$t('Upload')"
										:accept-types="playersiteTemplateTypes"
										:disabled="settings.templatename.length === 0"
										@start="saving = true"
										@error="showUploadError"
										@upload="uploadTemplate"
									/>
								</div>
							</div>
						</div>
					</template>

					<template #design>
						<div class="space-y-5">
							<div>
								<h2 class="text-lg font-semibold text-highlighted">{{ $t('Design') }}</h2>
								<p class="mt-1 text-sm text-muted">{{ $t('Adjust publication site colors and background as you like.') }}</p>
							</div>

							<h3 class="font-medium text-highlighted">{{ $t('Text colors') }}</h3>
							<PlayerColorField v-model="settings.textcolor_default" :label="$t('Default')" />
							<PlayerColorField v-model="settings.textcolor_title" :label="$t('Headline')" />
							<div class="grid grid-cols-2 gap-4">
								<PlayerColorField v-model="settings.textcolor_link" :label="$t('Link')" />
								<PlayerColorField v-model="settings.textcolor_link_hover" :label="$t('Link, mouseover')" />
							</div>

							<USeparator />

							<h3 class="font-medium text-highlighted">{{ $t('Background colors') }}</h3>
							<PlayerColorField v-model="settings.bgcolor_default" :label="$t('Default')" />
							<PlayerColorField v-model="settings.bgcolor_header" :label="$t('Header')" />
							<PlayerColorField v-model="settings.bgcolor_selected" :label="$t('Selected')" />
							<PlayerColorField v-model="settings.bgcolor_unselected" :label="$t('Unselected')" />
							<PlayerColorField v-model="settings.hrcolor" :label="$t('Linecolor')" />

							<USeparator />

							<h3 class="font-medium text-highlighted">{{ $t('Background image') }}</h3>
							<div class="grid gap-4 md:grid-cols-12">
								<UFormField :label="$t('Image URL')" :help="$t('Address for the background image.')" class="md:col-span-8">
									<UInput v-model="settings.bgimage_url" class="w-full" />
								</UFormField>
								<div class="md:col-span-4 md:pt-6">
									<PlayerUploadButton
										:label="$t('Upload')"
										:accept-types="playersiteImageTypes"
										@start="saving = true"
										@error="showUploadError"
										@upload="uploadBackgroundImage"
									/>
								</div>
							</div>
						</div>
					</template>

					<template #notes>
						<div class="space-y-5">
							<h2 class="text-lg font-semibold text-highlighted">{{ $t('Notes') }}</h2>

							<h3 class="font-medium text-highlighted">{{ $t('Imprint') }}</h3>
							<UFormField :label="$t('Content')">
								<UTextarea v-model="settings.imprint" :rows="10" class="w-full" />
							</UFormField>

							<h3 class="font-medium text-highlighted">{{ $t('Terms') }}</h3>
							<UFormField :label="$t('Content')">
								<UTextarea v-model="settings.terms" :rows="10" class="w-full" />
							</UFormField>
						</div>
					</template>

					<template #code_injection>
						<div class="space-y-5">
							<div>
								<h2 class="text-lg font-semibold text-highlighted">{{ $t('Custom code injection') }}</h2>
								<p class="mt-1 text-sm text-muted">
									{{ $t('Add external widgets and styles to the publication site. You can find some examples on the help page.') }}
								</p>
							</div>

							<h3 class="font-medium text-highlighted">{{ $t('Extend header') }}</h3>
							<UFormField :label="$t('Inject 1')" :help="$t('For Stylesheets.')">
								<UTextarea v-model="settings.inject1" :rows="10" class="w-full font-mono" />
							</UFormField>

							<h3 class="font-medium text-highlighted">{{ $t('Extend channel list') }}</h3>
							<UFormField :label="$t('Inject 2')" :help="$t('Expands the area above the channel list (live chat).')">
								<UTextarea v-model="settings.inject2" :rows="10" class="w-full font-mono" />
							</UFormField>

							<h3 class="font-medium text-highlighted">{{ $t('Extend content') }}</h3>
							<UFormField :label="$t('Inject 3')" :help="$t('Expands the area under the channel description (comment boxes).')">
								<UTextarea v-model="settings.inject3" :rows="10" class="w-full font-mono" />
							</UFormField>

							<h3 class="font-medium text-highlighted">{{ $t('Extend footer') }}</h3>
							<UFormField :label="$t('Inject 4')" :help="$t('For Javascripts.')">
								<UTextarea v-model="settings.inject4" :rows="10" class="w-full font-mono" />
							</UFormField>
						</div>
					</template>
				</UTabs>

				<div class="flex flex-wrap items-center gap-2 border-t border-default pt-4">
					<UButton color="neutral" variant="outline" :label="$t('Close')" to="/" />
					<span class="grow" />
					<UButton
						color="neutral"
						variant="outline"
						icon="i-lucide-external-link"
						:label="$t('Open')"
						:to="playersiteUrl"
						target="_blank"
						:disabled="!available"
					/>
					<UButton :label="$t('Save')" :loading="saving" @click="save" />
				</div>
			</div>

			<PlayerBusy :active="saving" />
			<PlayerUploadError v-model:open="uploadError.open" :title="uploadError.title" :error="uploadError.error" />

			<UModal v-model:open="deleteOpen" :title="$t('Delete')">
				<template #body>
					<p>{{ $t('Do you want to delete "{0}"?', [settings.template]) }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="deleteOpen = false" />
					<UButton color="error" :label="$t('Delete')" @click="deleteTemplate" />
				</template>
			</UModal>
		</template>
	</UDashboardPanel>
</template>
