<script setup lang="ts">
// The viewer page of one channel (/watch/<short id>): who may watch it and how it looks. Every
// channel has its own; a channel without a design of its own wears the site's.
import type { ViewerChannel } from '~/components/viewer/Page.vue';
import { copyTemplate } from '#shared/viewer/editor';
import { shortId } from '#shared/viewer/link';
import { defaultTemplate, type Preset, type Template } from '#shared/viewer/template';

type Access = 'public' | 'passcode' | 'hidden';

interface StoredChannel {
	channelid: string;
	access: Access;
	hasPasscode: boolean;
	limits: { maxViewers: number; expiresAt: string | null; maxUses: number };
	uses: number;
	template: Template | null;
	background: string;
}

interface Settings {
	enabled: boolean;
	title: string;
	background: string;
	channels: StoredChannel[];
	template: Template;
	presets: Preset[];
	builtinPresets: Preset[];
}

const route = useRoute();
const { t } = useI18n();
const toast = useToast();
const { api } = useRestreamer();
const { request, upload } = useViewerAdmin();
const asset = useAsset();

const channelid = computed(() => String(route.params.channelid));

const loading = ref(true);
const loadError = ref('');
const saving = ref(false);

const settings = ref<Settings | null>(null);
const name = ref('');

const access = ref<Access>('hidden');
// UPinInput with type="number" yields numbers.
const passcode = ref<number[]>([]);
// Numbers of UInput type="number"; empty = no limit.
const maxViewers = ref<number | undefined>();
const maxUses = ref<number | undefined>();
// <input type="datetime-local"> value, local time.
const expiresAt = ref('');
const resetUses = ref(false);

const ownDesign = ref(false);
const template = ref<Template>(defaultTemplate());
const background = ref('');
const presets = ref<Preset[]>([]);

const stored = computed(() => settings.value?.channels.find((c) => c.channelid === channelid.value));
const siteOff = computed(() => settings.value !== null && !settings.value.enabled);
const url = computed(() => `${window.location.origin}${asset('watch')}/${shortId(channelid.value)}`);

const code = computed(() => passcode.value.join(''));
const invalid = computed(
	() => (code.value.length > 0 && code.value.length < 6) || (access.value === 'passcode' && !stored.value?.hasPasscode && code.value.length !== 6),
);

const accessOptions = computed(() => [
	{ label: t('Public: anyone can watch'), value: 'public' },
	{ label: t('Passcode: viewers enter a 6-digit passcode'), value: 'passcode' },
	{ label: t('Hidden: not on the viewer site'), value: 'hidden' },
]);

const pad = (n: number) => String(n).padStart(2, '0');
function toLocalInput(iso: string | null): string {
	if (!iso) return '';
	const d = new Date(iso);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function apply(next: Settings) {
	settings.value = next;
	const channel = next.channels.find((c) => c.channelid === channelid.value);

	access.value = channel?.access ?? 'hidden';
	passcode.value = [];
	maxViewers.value = channel?.limits.maxViewers || undefined;
	maxUses.value = channel?.limits.maxUses || undefined;
	expiresAt.value = toLocalInput(channel?.limits.expiresAt ?? null);
	resetUses.value = false;

	ownDesign.value = !!channel?.template;
	// Without a design of its own the editor starts from a copy of the site's.
	template.value = channel?.template ?? copyTemplate(next.template);
	background.value = channel?.template ? channel.background : next.background;
	presets.value = next.presets;
}

async function load() {
	const selected = api().SelectChannel(channelid.value);
	if (selected === '' || selected !== channelid.value) {
		await navigateTo('/', { replace: true });
		return;
	}
	name.value = api().GetChannel(channelid.value)?.name ?? '';

	loading.value = true;
	loadError.value = '';
	try {
		apply(await request<Settings>('GET', 'config'));
	} catch (e: unknown) {
		loadError.value = (e as { statusMessage?: string }).statusMessage || t('The viewer page settings could not be loaded.');
	} finally {
		loading.value = false;
	}
}

async function save() {
	saving.value = true;
	try {
		// The name and description are shown to viewers; where the HLS lives decides which path the server fetches.
		const metadata = (await api().GetIngestMetadata(channelid.value)) as {
			control?: { hls?: { storage?: string } };
			meta?: { name?: string; description?: string };
		};
		apply(
			await request<Settings>('PUT', 'channel', {
				channelid: channelid.value,
				name: metadata?.meta?.name ?? name.value,
				description: metadata?.meta?.description ?? '',
				storage: metadata?.control?.hls?.storage === 'diskfs' ? 'diskfs' : 'memfs',
				access: access.value,
				passcode: code.value.length === 6 ? code.value : undefined,
				resetUses: resetUses.value,
				limits: {
					maxViewers: maxViewers.value ?? 0,
					maxUses: maxUses.value ?? 0,
					expiresAt: expiresAt.value ? new Date(expiresAt.value).toISOString() : null,
				},
				template: ownDesign.value ? template.value : null,
				background: ownDesign.value ? background.value : '',
				presets: presets.value,
				enable: access.value !== 'hidden',
			}),
		);
		toast.add({ title: t('Viewer page saved'), color: 'success' });
	} catch (e: unknown) {
		toast.add({ title: (e as { statusMessage?: string }).statusMessage || t('The viewer page could not be saved.'), color: 'error' });
	} finally {
		saving.value = false;
	}
}

// The preview shows the page as a viewer without a passcode sees it, in the design that will be saved.
const previewChannel = computed<ViewerChannel[]>(() => [
	{
		channelid: channelid.value,
		name: name.value,
		description: '',
		access: access.value === 'passcode' ? 'passcode' : 'public',
		unlocked: access.value !== 'passcode',
		expired: false,
		manifest: '',
		poster: '',
	},
]);
const previewTemplate = computed(() => (ownDesign.value ? template.value : (settings.value?.template ?? template.value)));
const previewBackground = computed(() => (ownDesign.value ? background.value : (settings.value?.background ?? '')));

onMounted(load);
watch(channelid, load);
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="$t('Viewer page: {name}', { name: name || $t('Main channel') })">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton color="neutral" variant="ghost" :label="$t('Close')" :to="`/${channelid}`" />
					<UButton icon="i-lucide-save" :loading="saving" :disabled="loading || loadError !== '' || invalid" :label="$t('Save')" @click="save" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="loading" class="flex justify-center py-16 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<UAlert
				v-else-if="loadError"
				color="error"
				variant="subtle"
				icon="i-lucide-circle-alert"
				:title="loadError"
				:actions="[{ label: $t('Retry'), onClick: load }]"
			/>

			<div v-else class="mx-auto w-full max-w-5xl space-y-8">
				<section class="space-y-4">
					<h2 class="ph-label text-muted">{{ $t('Who can watch') }}</h2>

					<UFormField :help="siteOff && access !== 'hidden' ? $t('The viewer site is switched off. Saving switches it on.') : undefined">
						<USelect v-model="access" :items="accessOptions" class="w-full max-w-md" :aria-label="$t('Who can watch')" />
					</UFormField>

					<template v-if="access === 'passcode'">
						<UFormField
							:label="stored?.hasPasscode ? $t('New passcode') : $t('Passcode')"
							:help="
								stored?.hasPasscode
									? $t('Leave empty to keep the current passcode. A new one signs out this channel\'s viewers and restarts the use count.')
									: $t('Six digits. Viewers need it to watch this channel.')
							"
							:error="code.length > 0 && code.length < 6 ? $t('The passcode must be exactly 6 digits.') : undefined"
						>
							<UPinInput v-model="passcode" :length="6" type="number" mask size="lg" />
						</UFormField>

						<div class="grid gap-4 sm:grid-cols-3">
							<UFormField :label="$t('Viewers at the same time')" :help="$t('Empty = no limit.')">
								<UInput v-model.number="maxViewers" type="number" min="1" step="1" class="w-full" />
							</UFormField>
							<UFormField :label="$t('Passcode expires')" :help="$t('Empty = never.')">
								<UInput v-model="expiresAt" type="datetime-local" class="w-full" />
							</UFormField>
							<UFormField :label="$t('Times the passcode can be used')" :help="$t('Empty = no limit.')">
								<UInput v-model.number="maxUses" type="number" min="1" step="1" class="w-full" />
							</UFormField>
						</div>

						<div v-if="stored?.hasPasscode" class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
							<span class="font-mono text-muted">{{ $t('Used {count} times', { count: stored.uses }) }}</span>
							<UCheckbox v-if="stored.uses > 0" v-model="resetUses" :label="$t('Restart the use count when saving')" />
						</div>
					</template>

					<div v-if="!siteOff && stored && stored.access !== 'hidden'" class="flex max-w-xl items-end gap-2">
						<PlayerCopyField :label="$t('Link for viewers')" :value="url" class="min-w-0 flex-1" />
						<UButton
							color="neutral"
							variant="outline"
							icon="i-lucide-external-link"
							:label="$t('Open')"
							:to="`/watch/${shortId(channelid)}`"
							target="_blank"
						/>
					</div>
				</section>

				<section class="space-y-4">
					<h2 class="ph-label text-muted">{{ $t('Design') }}</h2>
					<USwitch
						v-model="ownDesign"
						:label="$t('This channel has its own design')"
						:description="ownDesign ? $t('Changes here apply to this channel\'s page only.') : $t('The page uses the design of the viewer site.')"
					/>

					<template v-if="ownDesign">
						<UFormField
							:label="$t('Background picture')"
							:help="$t('Shown behind the page: upload a picture (PNG, JPEG, WebP or GIF, up to 5 MB) or enter its address. Empty = none.')"
						>
							<ViewerImageField v-model="background" :upload="upload" class="max-w-xl" />
						</UFormField>

						<ViewerTemplateEditor
							v-model:template="template"
							v-model:presets="presets"
							:builtin-presets="settings?.builtinPresets ?? []"
							:upload="upload"
						/>
					</template>
					<UButton
						v-else
						color="neutral"
						variant="link"
						class="px-0"
						trailing-icon="i-lucide-arrow-right"
						:label="$t('Edit the design of the viewer site')"
						to="/viewers"
					/>
				</section>

				<section class="space-y-2">
					<h2 class="ph-label text-muted">{{ $t('Preview') }}</h2>
					<div class="overflow-hidden rounded-lg border border-default">
						<ViewerPage
							preview
							single
							:title="settings?.title ?? ''"
							:background="previewBackground"
							:template="previewTemplate"
							:channels="previewChannel"
							:selected-id="channelid"
						/>
					</div>
				</section>
			</div>
		</template>
	</UDashboardPanel>
</template>
