<script setup lang="ts">
// Where viewers watch one channel on the viewer site, and who may: shown and set where the
// channel's player is set up. Limits and the page design stay on the "Viewer site" page.
import { shortId } from '#shared/viewer/link';

const props = defineProps<{ channelid: string }>();

type Access = 'public' | 'passcode' | 'hidden';
interface Settings {
	enabled: boolean;
	channels: { channelid: string; access: Access; hasPasscode: boolean }[];
}

const { t } = useI18n();
const toast = useToast();
const { api, accessToken } = useRestreamer();
const asset = useAsset();

// null until the settings are loaded (or if they cannot be).
const settings = ref<Settings | null>(null);
const access = ref<Access>('hidden');
// UPinInput with type="number" yields numbers.
const passcode = ref<number[]>([]);
const saving = ref(false);

const stored = computed(() => settings.value?.channels.find((c) => c.channelid === props.channelid));
const storedAccess = computed<Access>(() => stored.value?.access ?? 'hidden');
const siteOff = computed(() => settings.value !== null && !settings.value.enabled);

const url = computed(() => `${window.location.origin}${asset('watch')}/${shortId(props.channelid)}`);
const code = computed(() => passcode.value.join(''));
const needsCode = computed(() => access.value === 'passcode' && !stored.value?.hasPasscode);
const invalid = computed(() => (code.value.length > 0 && code.value.length < 6) || (needsCode.value && code.value.length !== 6));
// Choosing "public" or "passcode" while the site is off switches it on: that is what the choice asks for.
const dirty = computed(() => access.value !== storedAccess.value || code.value.length === 6 || (siteOff.value && access.value !== 'hidden'));

const accessOptions = computed(() => [
	{ label: t('Public: anyone can watch'), value: 'public' },
	{ label: t('Passcode: viewers enter a 6-digit passcode'), value: 'passcode' },
	{ label: t('Hidden: not on the viewer site'), value: 'hidden' },
]);

const status = computed(() => {
	if (siteOff.value) return { state: 'off' as const, label: t('Off') };
	if (storedAccess.value === 'public') return { state: 'ready' as const, label: t('Public') };
	if (storedAccess.value === 'passcode') return { state: 'ready' as const, label: t('Passcode') };
	return { state: 'off' as const, label: t('Hidden') };
});

async function request(method: 'GET' | 'PUT', body?: Record<string, unknown>): Promise<Settings> {
	const token = await accessToken();
	return await $fetch<Settings>(method === 'GET' ? '/api/viewer/config' : '/api/viewer/channel', {
		method,
		body,
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});
}

function apply(next: Settings) {
	settings.value = next;
	access.value = storedAccess.value;
	passcode.value = [];
}

async function load() {
	try {
		apply(await request('GET'));
	} catch {
		// Without the settings the link is still right; only the choice is left out.
		settings.value = null;
	}
}

async function save() {
	saving.value = true;
	try {
		// The name and description are shown to viewers; where the HLS lives decides which path the server fetches.
		const metadata = (await api().GetIngestMetadata(props.channelid)) as {
			control?: { hls?: { storage?: string } };
			meta?: { name?: string; description?: string };
		};
		apply(
			await request('PUT', {
				channelid: props.channelid,
				name: metadata?.meta?.name ?? '',
				description: metadata?.meta?.description ?? '',
				storage: metadata?.control?.hls?.storage === 'diskfs' ? 'diskfs' : 'memfs',
				access: access.value,
				passcode: code.value.length === 6 ? code.value : undefined,
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

onMounted(load);
watch(() => props.channelid, load);
</script>

<template>
	<section class="space-y-4 rounded-lg border border-default bg-elevated p-4" :aria-label="$t('Viewer page')">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="font-semibold text-highlighted">{{ $t('Viewer page') }}</h2>
			<TallyBadge v-if="settings" :state="status.state" :label="status.label" />
		</div>
		<p class="text-sm text-muted">{{ $t('The page of this channel on your viewer site.') }}</p>

		<template v-if="settings">
			<UFormField
				:label="$t('Who can watch')"
				:help="siteOff && access !== 'hidden' ? $t('The viewer site is switched off. Saving switches it on.') : undefined"
			>
				<USelect v-model="access" :items="accessOptions" class="w-full max-w-md" />
			</UFormField>

			<UFormField
				v-if="access === 'passcode'"
				:label="stored?.hasPasscode ? $t('New passcode') : $t('Passcode')"
				:help="stored?.hasPasscode ? $t('Leave empty to keep the current passcode.') : $t('Six digits. Viewers need it to watch this channel.')"
				:error="code.length > 0 && code.length < 6 ? $t('The passcode must be exactly 6 digits.') : undefined"
			>
				<UPinInput v-model="passcode" :length="6" type="number" mask size="lg" />
			</UFormField>
		</template>

		<PlayerCopyField v-if="!settings || (!siteOff && storedAccess !== 'hidden')" :label="$t('Link for viewers')" :value="url" />

		<div class="flex flex-wrap items-center justify-between gap-2">
			<UButton color="neutral" variant="link" class="px-0" trailing-icon="i-lucide-arrow-right" :label="$t('Limits and page design')" to="/viewers" />
			<UButton
				v-if="settings"
				color="neutral"
				variant="outline"
				icon="i-lucide-save"
				:loading="saving"
				:disabled="!dirty || invalid"
				:label="$t('Save viewer page')"
				@click="save"
			/>
		</div>
	</section>
</template>
