<script setup lang="ts">
// Admin settings of the View Portal. Saved on this UI's server (not in the core); the server
// accepts the request because the core accepts our access token.
interface PortalChannel {
	channelid: string;
	name: string;
	storage: 'memfs' | 'diskfs';
}

interface PortalSettings {
	enabled: boolean;
	title: string;
	channels: PortalChannel[];
	hasPasscode: boolean;
}

const { t } = useI18n();
const toast = useToast();
const { state, api, accessToken } = useRestreamer();

const loading = ref(true);
const saving = ref(false);
const loadError = ref('');

const enabled = ref(false);
const title = ref('');
const selected = ref<string[]>([]);
const hasPasscode = ref(false);
// UPinInput with type="number" yields numbers.
const passcode = ref<number[]>([]);

const portalUrl = computed(() => (import.meta.client ? `${window.location.origin}/portal` : '/portal'));

const passcodeText = computed(() => passcode.value.join(''));
const passcodeIncomplete = computed(() => passcodeText.value.length > 0 && passcodeText.value.length < 6);
const needsPasscode = computed(() => enabled.value && !hasPasscode.value && passcodeText.value.length !== 6);

async function request(method: 'GET' | 'PUT', body?: Record<string, unknown>): Promise<PortalSettings> {
	const token = await accessToken();
	return await $fetch<PortalSettings>('/api/portal/config', { method, body, headers: token ? { Authorization: `Bearer ${token}` } : {} });
}

function apply(settings: PortalSettings) {
	enabled.value = settings.enabled;
	title.value = settings.title;
	hasPasscode.value = settings.hasPasscode;
	// Channels that were deleted in the meantime drop out of the selection.
	const known = new Set(state.value.channels.map((c) => c.channelid));
	selected.value = settings.channels.map((c) => c.channelid).filter((id) => known.has(id));
	passcode.value = [];
}

async function load() {
	loading.value = true;
	loadError.value = '';
	try {
		apply(await request('GET'));
	} catch (e: unknown) {
		loadError.value = (e as { statusMessage?: string }).statusMessage || t('The portal settings could not be loaded.');
	} finally {
		loading.value = false;
	}
}

// Where the channel's HLS lives decides which path the server proxies.
async function storageOf(channelid: string): Promise<'memfs' | 'diskfs'> {
	const metadata = await api().GetIngestMetadata(channelid);
	return metadata?.control?.hls?.storage === 'diskfs' ? 'diskfs' : 'memfs';
}

async function save() {
	saving.value = true;
	try {
		const channels: PortalChannel[] = [];
		for (const channel of state.value.channels) {
			if (!selected.value.includes(channel.channelid)) continue;
			channels.push({ channelid: channel.channelid, name: channel.name, storage: await storageOf(channel.channelid) });
		}

		apply(
			await request('PUT', {
				enabled: enabled.value,
				title: title.value,
				channels,
				passcode: passcodeText.value.length === 6 ? passcodeText.value : undefined,
			}),
		);
		toast.add({ title: t('Portal settings saved'), color: 'success' });
	} catch (e: unknown) {
		toast.add({ title: (e as { statusMessage?: string }).statusMessage || t('The portal settings could not be saved.'), color: 'error' });
	} finally {
		saving.value = false;
	}
}

function toggle(channelid: string, on: boolean | 'indeterminate') {
	selected.value = on === true ? [...new Set([...selected.value, channelid])] : selected.value.filter((id) => id !== channelid);
}

onMounted(load);
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="$t('View Portal')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton icon="i-lucide-external-link" color="neutral" variant="ghost" :label="$t('Open portal')" to="/portal" target="_blank" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div class="mx-auto max-w-2xl space-y-6">
				<div>
					<p class="text-sm text-muted">{{ $t('A page where viewers watch selected channels after entering a 6-digit passcode.') }}</p>
				</div>

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

				<form v-else class="space-y-6" @submit.prevent="save">
					<UCard>
						<div class="space-y-5">
							<USwitch v-model="enabled" :label="$t('Enable the View Portal')" :description="portalUrl" />

							<UFormField :label="$t('Title')" :help="$t('Shown at the top of the portal.')">
								<UInput v-model="title" class="w-full" maxlength="200" />
							</UFormField>

							<UFormField
								:label="hasPasscode ? $t('New passcode') : $t('Passcode')"
								:help="
									hasPasscode
										? $t('Leave empty to keep the current passcode. Changing it signs out all viewers.')
										: $t('Six digits. Viewers need it to watch.')
								"
								:error="passcodeIncomplete ? $t('The passcode must be exactly 6 digits.') : undefined"
							>
								<UPinInput v-model="passcode" :length="6" type="number" mask />
							</UFormField>
						</div>
					</UCard>

					<UCard>
						<template #header>
							<h2 class="font-medium text-highlighted">{{ $t('Channels') }}</h2>
						</template>

						<UEmpty v-if="state.channels.length === 0" icon="i-lucide-tv" :title="$t('No channels yet')" />
						<div v-else class="space-y-3">
							<UCheckbox
								v-for="channel in state.channels"
								:key="channel.channelid"
								:model-value="selected.includes(channel.channelid)"
								:label="channel.name || $t('Main channel')"
								@update:model-value="(on) => toggle(channel.channelid, on)"
							/>
						</div>
					</UCard>

					<UAlert
						color="warning"
						variant="subtle"
						icon="i-lucide-shield-alert"
						:title="$t('The passcode only protects streams watched through the portal.')"
						:description="
							$t(
								'The stream addresses of the core itself stay reachable for anyone who knows them, until direct access to the core is restricted on your network or reverse proxy.',
							)
						"
					/>

					<div class="flex justify-end">
						<UButton type="submit" :loading="saving" :disabled="passcodeIncomplete || needsPasscode" :label="$t('Save')" />
					</div>
				</form>
			</div>
		</template>
	</UDashboardPanel>
</template>
