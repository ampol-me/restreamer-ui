<script setup lang="ts">
// Admin settings of the viewer site: who may watch which channel, and how the page looks.
// Saved on this UI's server (not in the core); the server accepts the request because the
// core accepts our access token.
import type { ViewerChannel } from '~/components/viewer/Page.vue';
import { shortId } from '#shared/viewer/link';
import { defaultTemplate, type Preset, type Template } from '#shared/viewer/template';

type Access = 'public' | 'passcode' | 'hidden';

interface Limits {
	maxViewers: number;
	expiresAt: string | null;
	maxUses: number;
}

interface StoredChannel {
	channelid: string;
	name: string;
	description: string;
	storage: 'memfs' | 'diskfs';
	access: Access;
	hasPasscode: boolean;
	limits: Limits;
	uses: number;
}

interface Settings {
	enabled: boolean;
	title: string;
	background: string;
	channels: StoredChannel[];
	template: Template;
	presets: Preset[];
	builtinPresets: Preset[];
	watching: Record<string, number>;
}

// One row of the form. Numbers of UInput type="number" are kept as numbers; empty = no limit.
interface Row {
	channelid: string;
	name: string;
	access: Access;
	hasPasscode: boolean;
	// UPinInput with type="number" yields numbers.
	passcode: number[];
	maxViewers: number | undefined;
	maxUses: number | undefined;
	// <input type="datetime-local"> value, local time.
	expiresAt: string;
	uses: number;
	resetUses: boolean;
	watching: number;
}

const { t } = useI18n();
const toast = useToast();
const { state, api, accessToken } = useRestreamer();
const asset = useAsset();

const loading = ref(true);
const saving = ref(false);
const loadError = ref('');

const enabled = ref(false);
const title = ref('');
const background = ref('');
const rows = ref<Row[]>([]);
const template = ref<Template>(defaultTemplate());
const presets = ref<Preset[]>([]);
const builtinPresets = ref<Preset[]>([]);

const tab = ref('access');
const tabs = computed(() => [
	{ label: t('Access'), value: 'access', icon: 'i-lucide-key-round' },
	{ label: t('Design'), value: 'design', icon: 'i-lucide-layout-template' },
]);

const accessOptions = computed(() => [
	{ label: t('Public: anyone can watch'), value: 'public' },
	{ label: t('Passcode: viewers enter a 6-digit passcode'), value: 'passcode' },
	{ label: t('Hidden: not on the viewer site'), value: 'hidden' },
]);

const siteUrl = computed(() => window.location.origin + asset('watch'));
const channelUrl = (channelid: string) => `${siteUrl.value}/${shortId(channelid)}`;

async function copyLink(channelid: string) {
	try {
		await navigator.clipboard.writeText(channelUrl(channelid));
		toast.add({ title: t('Link copied'), color: 'success' });
	} catch {
		toast.add({ title: t('The link could not be copied.'), color: 'error' });
	}
}

const pad = (n: number) => String(n).padStart(2, '0');
function toLocalInput(iso: string | null): string {
	if (!iso) return '';
	const d = new Date(iso);
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const passcodeOf = (row: Row) => row.passcode.join('');
const incomplete = (row: Row) => row.access === 'passcode' && passcodeOf(row).length > 0 && passcodeOf(row).length < 6;
const missing = (row: Row) => row.access === 'passcode' && !row.hasPasscode && passcodeOf(row).length !== 6;
const expired = (row: Row) => row.access === 'passcode' && row.expiresAt !== '' && new Date(row.expiresAt).getTime() <= Date.now();
const invalid = computed(() => rows.value.some((r) => incomplete(r) || missing(r)));

async function request(method: 'GET' | 'PUT', body?: Record<string, unknown>): Promise<Settings> {
	const token = await accessToken();
	return await $fetch<Settings>('/api/viewer/config', { method, body, headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

function apply(settings: Settings) {
	enabled.value = settings.enabled;
	title.value = settings.title;
	background.value = settings.background;
	template.value = settings.template;
	presets.value = settings.presets;
	builtinPresets.value = settings.builtinPresets;

	// The core's channels are the list; stored settings attach by id. A channel deleted from
	// the core drops out here and from the stored settings with the next save.
	const stored = new Map(settings.channels.map((c) => [c.channelid, c]));
	rows.value = state.value.channels.map((channel): Row => {
		const s = stored.get(channel.channelid);
		return {
			channelid: channel.channelid,
			name: channel.name,
			access: s?.access ?? 'hidden',
			hasPasscode: s?.hasPasscode ?? false,
			passcode: [],
			maxViewers: s?.limits.maxViewers || undefined,
			maxUses: s?.limits.maxUses || undefined,
			expiresAt: toLocalInput(s?.limits.expiresAt ?? null),
			uses: s?.uses ?? 0,
			resetUses: false,
			watching: settings.watching[channel.channelid] ?? 0,
		};
	});
}

async function load() {
	loading.value = true;
	loadError.value = '';
	try {
		apply(await request('GET'));
	} catch (e: unknown) {
		loadError.value = (e as { statusMessage?: string }).statusMessage || t('The viewer site settings could not be loaded.');
	} finally {
		loading.value = false;
	}
}

async function save() {
	saving.value = true;
	try {
		const channels = [];
		for (const row of rows.value) {
			// Where the channel's HLS lives decides which path the server fetches; the description is shown to viewers.
			const metadata = (await api().GetIngestMetadata(row.channelid)) as { control?: { hls?: { storage?: string } }; meta?: { description?: string } };
			channels.push({
				channelid: row.channelid,
				name: row.name,
				description: metadata?.meta?.description ?? '',
				storage: metadata?.control?.hls?.storage === 'diskfs' ? 'diskfs' : 'memfs',
				access: row.access,
				passcode: passcodeOf(row).length === 6 ? passcodeOf(row) : undefined,
				resetUses: row.resetUses,
				limits: {
					maxViewers: row.maxViewers ?? 0,
					maxUses: row.maxUses ?? 0,
					expiresAt: row.expiresAt ? new Date(row.expiresAt).toISOString() : null,
				},
			});
		}

		apply(
			await request('PUT', {
				enabled: enabled.value,
				title: title.value,
				background: background.value,
				channels,
				template: template.value,
				presets: presets.value,
			}),
		);
		toast.add({ title: t('Viewer site saved'), color: 'success' });
	} catch (e: unknown) {
		toast.add({ title: (e as { statusMessage?: string }).statusMessage || t('The viewer site settings could not be saved.'), color: 'error' });
	} finally {
		saving.value = false;
	}
}

// Pictures go to this server; the answer is the reference the settings store.
async function upload(file: File): Promise<string | null> {
	if (file.size > 5 * 1024 * 1024) {
		toast.add({ title: t('The picture is larger than 5 MB.'), color: 'error' });
		return null;
	}
	try {
		const token = await accessToken();
		const { url } = await $fetch<{ url: string }>('/api/viewer/images', {
			method: 'POST',
			body: file,
			headers: { 'Content-Type': 'application/octet-stream', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
		});
		return url;
	} catch (e: unknown) {
		toast.add({ title: (e as { statusMessage?: string }).statusMessage || t('The picture could not be uploaded.'), color: 'error' });
		return null;
	}
}

// The preview shows the page as a viewer without any passcode sees it.
const previewChannels = computed<ViewerChannel[]>(() =>
	rows.value
		.filter((r) => r.access !== 'hidden')
		.map((r) => ({
			channelid: r.channelid,
			name: r.name,
			description: '',
			access: r.access as 'public' | 'passcode',
			unlocked: r.access === 'public',
			expired: false,
			manifest: '',
			poster: '',
		})),
);
const previewSelected = ref<string | null>(null);
const previewSelectedId = computed(
	() => previewChannels.value.find((c) => c.channelid === previewSelected.value)?.channelid ?? previewChannels.value[0]?.channelid ?? null,
);

onMounted(load);
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="$t('Viewer site')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-external-link" color="neutral" variant="ghost" :label="$t('Open page')" to="/watch" target="_blank" />
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

			<div v-else class="mx-auto w-full max-w-5xl space-y-6">
				<p class="text-sm text-muted">
					{{ $t('One page where viewers watch your channels. Each channel is public, protected by its own passcode, or hidden.') }}
				</p>

				<UTabs v-model="tab" :items="tabs" :content="false" class="max-w-sm" />

				<div v-show="tab === 'access'" class="space-y-6">
					<UCard>
						<div class="space-y-5">
							<USwitch v-model="enabled" :label="$t('Enable the viewer site')" :description="siteUrl" />
							<UFormField :label="$t('Title')" :help="$t('Shown at the top of the page.')">
								<UInput v-model="title" class="w-full max-w-md" maxlength="200" />
							</UFormField>
						</div>
					</UCard>

					<UEmpty v-if="rows.length === 0" icon="i-lucide-tv" :title="$t('No channels yet')" />

					<UCard v-for="row in rows" :key="row.channelid">
						<div class="space-y-4">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<h2 class="font-semibold text-highlighted">{{ row.name || $t('Main channel') }}</h2>
								<div class="flex items-center gap-2">
									<TallyBadge v-if="expired(row)" state="off" :label="$t('Expired')" />
									<span v-if="row.access === 'passcode'" class="font-mono text-sm text-muted">
										{{ $t('{count} watching now', { count: row.watching }) }}
									</span>
								</div>
							</div>

							<UFormField :label="$t('Who can watch')">
								<USelect v-model="row.access" :items="accessOptions" class="w-full max-w-md" />
							</UFormField>

							<UFormField v-if="row.access !== 'hidden'" :label="$t('Page of this channel only')">
								<div class="flex max-w-xl items-center gap-2">
									<UInput :model-value="channelUrl(row.channelid)" readonly class="min-w-0 flex-1 font-mono" />
									<UButton color="neutral" variant="outline" icon="i-lucide-copy" :label="$t('Copy')" @click="copyLink(row.channelid)" />
								</div>
							</UFormField>

							<template v-if="row.access === 'passcode'">
								<UFormField
									:label="row.hasPasscode ? $t('New passcode') : $t('Passcode')"
									:help="
										row.hasPasscode
											? $t(
													'Leave empty to keep the current passcode. A new one signs out this channel\'s viewers and restarts the use count.',
												)
											: $t('Six digits. Viewers need it to watch this channel.')
									"
									:error="
										incomplete(row)
											? $t('The passcode must be exactly 6 digits.')
											: missing(row)
												? $t('Set a passcode for this channel.')
												: undefined
									"
								>
									<UPinInput v-model="row.passcode" :length="6" type="number" mask size="lg" />
								</UFormField>

								<div class="grid gap-4 sm:grid-cols-3">
									<UFormField :label="$t('Viewers at the same time')" :help="$t('Empty = no limit.')">
										<UInput v-model.number="row.maxViewers" type="number" min="1" step="1" class="w-full" />
									</UFormField>
									<UFormField :label="$t('Passcode expires')" :help="$t('Empty = never.')">
										<UInput v-model="row.expiresAt" type="datetime-local" class="w-full" />
									</UFormField>
									<UFormField :label="$t('Times the passcode can be used')" :help="$t('Empty = no limit.')">
										<UInput v-model.number="row.maxUses" type="number" min="1" step="1" class="w-full" />
									</UFormField>
								</div>

								<div v-if="row.hasPasscode" class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
									<span class="font-mono text-muted">{{ $t('Used {count} times', { count: row.uses }) }}</span>
									<UCheckbox v-if="row.uses > 0" v-model="row.resetUses" :label="$t('Restart the use count when saving')" />
								</div>
							</template>
						</div>
					</UCard>

					<UAlert
						color="warning"
						variant="subtle"
						icon="i-lucide-shield-alert"
						:title="$t('Passcodes only protect streams watched through this page.')"
						:description="
							$t(
								'The stream addresses of the core itself stay reachable for anyone who knows them, until direct access to the core is restricted on your network or reverse proxy.',
							)
						"
					/>
				</div>

				<div v-show="tab === 'design'" class="space-y-6">
					<UFormField
						:label="$t('Background picture')"
						:help="$t('Shown behind the page: upload a picture (PNG, JPEG, WebP or GIF, up to 5 MB) or enter its address. Empty = none.')"
					>
						<ViewerImageField v-model="background" :upload="upload" class="max-w-xl" />
					</UFormField>

					<ViewerTemplateEditor v-model:template="template" v-model:presets="presets" :builtin-presets="builtinPresets" :upload="upload" />

					<section class="space-y-2">
						<h3 class="ph-label text-muted">{{ $t('Preview') }}</h3>
						<div class="overflow-hidden rounded-lg border border-default">
							<ViewerPage
								preview
								:title="title"
								:background="background"
								:template="template"
								:channels="previewChannels"
								:selected-id="previewSelectedId"
								@select="(id) => (previewSelected = id)"
							/>
						</div>
					</section>
				</div>
			</div>
		</template>
	</UDashboardPanel>
</template>
