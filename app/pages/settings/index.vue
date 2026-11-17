<script setup lang="ts">
import type { CoreClient } from '#shared/core/types';
import type { SettingsClient } from '#shared/core/types.settings';
import {
	CORE_CONFIG_FIELD,
	RETRIES,
	SETTINGS_CONTEXT,
	changedValues,
	helpUrl,
	isOutdated,
	parseCoreConfig,
	reloadKeyOf,
	saveErrorMessages,
	saveErrorNotice,
	tabsWithErrors,
	toForm,
	toPayload,
	validateForm,
	isSettingsTab,
	visibleTabs,
	waitForRestart,
	type CoreConfig,
	type CoreConfigResponse,
	type SettingsContext,
	type SettingsForm,
	type SettingsMessage,
	type SettingsTab,
} from '#shared/settings/config';

// System settings: the config of the core. Saving stores it; the core applies it on a restart.
const route = useRoute();
const router = useRouter();
const { t, locale } = useI18n();
const toast = useToast();
const { api, login } = useRestreamer();
const client = () => api() as unknown as CoreClient & SettingsClient;

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const ready = ref(false);
const failed = ref(false);
const saving = ref(false);

const config = ref<CoreConfig>({});
const overrides = ref<string[]>([]);
const form = ref<SettingsForm>(toForm({}));
// The form as the core has it stored, to tell what changed.
const saved = ref<SettingsForm>(toForm({}));
const coreConfig = ref('');
const outdated = ref(false);
const service = ref(false);
const reloadKey = ref('');

const expert = ref(false);
const checkForUpdates = ref(false);
const hasUpdates = ref(false);

function apply(data: CoreConfigResponse) {
	config.value = data.config;
	overrides.value = data.overrides ?? [];
	form.value = toForm(data.config);
	saved.value = clone(form.value);
	previous = clone(form.value);
	coreConfig.value = '';
	outdated.value = isOutdated(data);
	serverMessages.value = [];
}

async function load() {
	ready.value = false;
	failed.value = false;

	reloadKey.value = reloadKeyOf(client().CreatedAt());
	service.value = client().HasService();

	const data = await client().Config();
	if (data === null) {
		failed.value = true;
	} else {
		apply(data);
	}

	ready.value = true;
}

onMounted(async () => {
	expert.value = client().IsExpert();
	checkForUpdates.value = client().CheckForUpdates();
	hasUpdates.value = client().HasUpdates();

	// Both are preferences of this browser and take effect at once, without Save.
	watch(expert, (value) => client().SetExpert(value));
	watch(checkForUpdates, (value) => client().SetCheckForUpdates(value));

	await load();
});

// The update check runs in the background of the client.
usePolling(async () => {
	hasUpdates.value = client().HasUpdates();
}, 2000);

// Tabs

// A tab that a link opened ("Enable the RTMP server") or that holds an error is shown in any mode.
const linkedTab = computed(() => (isSettingsTab(route.query.tab) ? [route.query.tab] : []));
const tabNames = computed(() => visibleTabs({ expert: expert.value, service: service.value, keep: [...linkedTab.value, ...errorTabs.value] }));

const tab = computed<SettingsTab>({
	get: () => tabNames.value.find((name) => name === route.query.tab) ?? 'general',
	set: (value) => void router.replace({ query: { ...route.query, tab: value } }),
});

function selectTab(value: string | number) {
	const name = tabNames.value.find((n) => n === value);
	if (name) tab.value = name;
}

// Messages: the rules of this UI, and what the core said about the last save.

const serverMessages = ref<SettingsMessage[]>([]);
const messages = computed(() => [...validateForm(form.value), ...serverMessages.value]);
const errorTabs = computed(() => tabsWithErrors(messages.value));

// What the core objected to stands until that value is edited.
let previous = clone(form.value);
watch(
	form,
	(current) => {
		const changed = changedValues(previous, current);
		if (changed.length === 0) return;
		previous = clone(current);
		serverMessages.value = serverMessages.value.filter((m) => !changed.includes(m.configvalue));
	},
	{ deep: true },
);
watch(coreConfig, () => {
	serverMessages.value = serverMessages.value.filter((m) => m.configvalue !== CORE_CONFIG_FIELD);
});

provide<SettingsContext>(SETTINGS_CONTEXT, {
	env: (configvalue) => overrides.value.includes(configvalue),
	errors: (configvalue) => messages.value.filter((m) => m.configvalue === configvalue),
});

const tabLabels = computed<Record<SettingsTab, string>>(() => ({
	general: t('General'),
	service: t('Service'),
	network: t('Network'),
	auth: t('Sign-in'),
	playback: t('Playback'),
	storage: t('Storage'),
	rtmp: t('RTMP'),
	srt: t('SRT'),
	logging: t('Logging'),
}));

const tabs = computed(() =>
	tabNames.value.map((name) => ({
		label: tabLabels.value[name],
		value: name,
		icon: errorTabs.value.has(name) ? 'i-lucide-triangle-alert' : undefined,
	})),
);

// Changes

// Compared as the core would get them: "8080" typed over 8080 is not a change.
const dirty = computed(() => {
	if (!ready.value || failed.value) return false;
	if (coreConfig.value.length !== 0) return true;
	return JSON.stringify(toPayload(config.value, form.value, overrides.value)) !== JSON.stringify(toPayload(config.value, saved.value, overrides.value));
});

const leaveTo = ref<string | null>(null);
let leaveConfirmed = false;

onBeforeRouteLeave((to) => {
	if (!dirty.value || leaveConfirmed) return true;
	leaveTo.value = to.fullPath;
	return false;
});

async function leave() {
	const to = leaveTo.value;
	leaveTo.value = null;
	if (to === null) return;
	leaveConfirmed = true;
	await navigateTo(to);
}

function beforeUnload(event: BeforeUnloadEvent) {
	if (dirty.value) event.preventDefault();
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload));
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload));

function close() {
	// Back to where the settings were opened from; there is nothing to go back to on a direct visit.
	if (window.history.state?.back) {
		router.back();
	} else {
		void navigateTo('/');
	}
}

// Save

const savedOpen = ref(false);
const restartOpen = ref(false);

async function save() {
	saving.value = true;
	try {
		let payload: CoreConfig;
		const custom = coreConfig.value.length !== 0;

		if (custom) {
			const parsed = parseCoreConfig(coreConfig.value);
			if (parsed.config === null) {
				serverMessages.value = [{ configvalue: CORE_CONFIG_FIELD, error: parsed.error }];
				return;
			}
			payload = parsed.config;
		} else {
			payload = toPayload(config.value, form.value, overrides.value);
		}

		const [, err] = await client().ConfigSet(payload);
		if (err !== null) {
			toast.add({ title: t(saveErrorNotice(err.code)), color: 'error' });
			serverMessages.value = saveErrorMessages(err);
			return;
		}

		toast.add({ title: t('Settings saved. All changes will be applied after restarting the application.'), color: 'success' });

		// Show what the core stored. If it cannot be read back, what was sent is the next best.
		const data = await client().Config();
		if (data !== null) {
			apply(data);
		} else {
			if (!custom) config.value = payload;
			saved.value = clone(form.value);
			coreConfig.value = '';
			serverMessages.value = [];
		}

		outdated.value = true;
		savedOpen.value = true;
	} finally {
		saving.value = false;
	}
}

// Restart

const restarting = ref(false);
const timeout = ref(false);

async function restart() {
	savedOpen.value = false;
	restartOpen.value = false;

	timeout.value = false;
	restarting.value = true;

	if (!(await client().ConfigReload())) {
		toast.add({ title: t('Restarting the application failed.'), color: 'error' });
		restarting.value = false;
		return;
	}

	// The core is away for a moment: its failing answers are expected, not errors to report.
	client().IgnoreAPIErrors(true);

	const restarted = await waitForRestart({ about: () => client().About(), reloadKey: reloadKey.value });
	if (!restarted) {
		// Stays blocked; the only way on is to reload the page.
		timeout.value = true;
		return;
	}

	client().IgnoreAPIErrors(false);

	// The restart invalidated the session. Sign in again with the credentials the core now has.
	const { username, password } = saved.value.api.auth;
	await client().Validate();
	if (await login(username, password)) {
		await load();
	}

	restarting.value = false;
}

const reloadPage = () => window.location.reload();
</script>

<template>
	<UDashboardPanel>
		<template #header>
			<UDashboardNavbar :title="$t('Settings')">
				<template #leading>
					<UDashboardSidebarCollapse />
				</template>
				<template #right>
					<UButton color="neutral" variant="ghost" icon="i-lucide-circle-help" :aria-label="$t('Help')" :to="helpUrl(tab, locale)" target="_blank" />
					<UButton color="neutral" variant="ghost" :label="$t('Close')" @click="close" />
					<UButton icon="i-lucide-save" :label="$t('Save')" :loading="saving" :disabled="!dirty" @click="save" />
				</template>
			</UDashboardNavbar>
		</template>

		<template #body>
			<div v-if="!ready" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<UAlert
				v-else-if="failed"
				class="mx-auto max-w-2xl"
				color="error"
				variant="subtle"
				icon="i-lucide-circle-alert"
				:title="$t('Error')"
				:description="$t('Unable to load the config.')"
				:actions="[{ label: $t('Retry'), onClick: load }]"
			/>

			<div v-else class="mx-auto w-full max-w-4xl space-y-6">
				<div class="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
					<p class="text-sm text-muted">
						{{
							expert
								? $t('All settings of the server are shown.')
								: $t('The settings most people need. Servers, ports and protocols are under "All settings".')
						}}
					</p>
					<USwitch v-model="expert" :label="$t('All settings')" />
				</div>

				<div class="overflow-x-auto">
					<!-- Manual: a dialog that closes hands the focus back to a tab, which must not select it. -->
					<UTabs :model-value="tab" :items="tabs" :content="false" activation-mode="manual" class="w-full min-w-max" @update:model-value="selectTab">
						<template #leading="{ item }">
							<UIcon v-if="item.icon" :name="item.icon" class="size-4 shrink-0 text-error" />
						</template>
					</UTabs>
				</div>

				<SettingsGeneral
					v-if="tab === 'general'"
					v-model="form"
					v-model:check-for-updates="checkForUpdates"
					:update-available="hasUpdates"
					:update-url="helpUrl('update-link', locale)"
					:outdated="outdated"
					@restart="restartOpen = true"
				/>
				<SettingsService v-else-if="tab === 'service'" v-model="form" v-model:core-config="coreConfig" />
				<SettingsNetwork v-else-if="tab === 'network'" v-model="form" />
				<SettingsAuth v-else-if="tab === 'auth'" v-model="form" />
				<SettingsPlayback v-else-if="tab === 'playback'" v-model="form" />
				<SettingsStorage v-else-if="tab === 'storage'" v-model="form" @tab="selectTab" />
				<SettingsRtmp v-else-if="tab === 'rtmp'" v-model="form" @tab="selectTab" />
				<SettingsSrt v-else-if="tab === 'srt'" v-model="form" />
				<SettingsLogging v-else-if="tab === 'logging'" v-model="form" :paused="restarting" />
			</div>

			<UModal v-model:open="savedOpen" :title="$t('Restart required')">
				<template #body>
					<p>
						{{
							$t(
								'You have changed the configuration. In order for the changes to take effect, you have to restart the application. Do you want to restart now?',
							)
						}}
					</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="savedOpen = false" />
					<UButton color="error" icon="i-lucide-rotate-cw" :label="$t('Restart')" @click="restart" />
				</template>
			</UModal>

			<UModal v-model:open="restartOpen" :title="$t('Restart')">
				<template #body>
					<p>{{ $t('Do you really want to restart the application now?') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="restartOpen = false" />
					<UButton color="error" icon="i-lucide-rotate-cw" :label="$t('Restart')" @click="restart" />
				</template>
			</UModal>

			<UModal :open="leaveTo !== null" :title="$t('Unsaved changes')" @update:open="(open) => !open && (leaveTo = null)">
				<template #body>
					<p>{{ $t('You have unsaved changes. Do you want to leave without saving them?') }}</p>
				</template>
				<template #footer>
					<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="leaveTo = null" />
					<UButton color="error" :label="$t('Leave without saving')" @click="leave" />
				</template>
			</UModal>

			<!-- Nothing can be done until the core is back, so this cannot be dismissed. -->
			<UModal :open="restarting" :title="$t('Restarting')" :dismissible="false" :close="false">
				<template #body>
					<div v-if="!timeout" class="space-y-4">
						<p>{{ $t('Restarting Restreamer Core ...') }}</p>
						<UProgress animation="carousel" />
					</div>
					<div v-else class="space-y-4">
						<p>{{ $t('Reconnecting to Restreamer Core failed for the last {RETRIES} seconds.', { RETRIES }) }}</p>
						<p>
							{{
								$t(
									`If you enabled Let's Encrypt TLS it might take some time to acquire the certificates. Make sure that Restreamer Core is reachable via port 80 from the internet. Please check the console log of Restreamer Core.`,
								)
							}}
						</p>
						<p>
							{{
								$t('If you changed the ports, it might be that Restreamer Core restarted already, but it is now available on a different port.')
							}}
						</p>
					</div>
				</template>
				<template #footer>
					<UButton :label="$t('Reload')" :disabled="!timeout" @click="reloadPage" />
				</template>
			</UModal>
		</template>
	</UDashboardPanel>
</template>
