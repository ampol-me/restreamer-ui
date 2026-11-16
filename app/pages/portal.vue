<script setup lang="ts">
// Public viewer page. It never touches the core: everything goes through this server's
// /api/portal/* routes, which check the passcode and proxy the streams.
definePageMeta({ layout: false });

interface PortalChannel {
	channelid: string;
	name: string;
	manifest: string;
	poster: string;
}

const { t } = useI18n();
const appConfig = useAppConfig();

const phase = ref<'loading' | 'disabled' | 'locked' | 'open'>('loading');
const title = ref('');
const channels = ref<PortalChannel[]>([]);
const selected = ref<PortalChannel | null>(null);

// UPinInput with type="number" yields numbers.
const pin = ref<number[]>([]);
const checking = ref(false);
const error = ref('');

useHead({ title: () => title.value || t('View Portal') });

async function loadChannels() {
	const data = await $fetch<{ title: string; channels: PortalChannel[] }>('/api/portal/channels');
	title.value = data.title;
	channels.value = data.channels;
	selected.value = data.channels.find((c) => c.channelid === selected.value?.channelid) ?? data.channels[0] ?? null;
	phase.value = 'open';
}

async function start() {
	try {
		const status = await $fetch<{ enabled: boolean; title: string; authenticated: boolean }>('/api/portal/status');
		title.value = status.title;
		if (!status.enabled) {
			phase.value = 'disabled';
		} else if (status.authenticated) {
			await loadChannels();
		} else {
			phase.value = 'locked';
		}
	} catch {
		phase.value = 'disabled';
	}
}

async function submit() {
	const passcode = pin.value.join('');
	if (!/^\d{6}$/.test(passcode) || checking.value) return;

	checking.value = true;
	error.value = '';
	try {
		await $fetch('/api/portal/login', { method: 'POST', body: { passcode } });
		await loadChannels();
	} catch (e: unknown) {
		const err = e as { statusCode?: number; data?: { data?: { retryAfter?: number } } };
		if (err.statusCode === 429) {
			const minutes = Math.ceil((err.data?.data?.retryAfter ?? 600) / 60);
			error.value = t('Too many attempts. Try again in {minutes} minutes.', { minutes });
		} else if (err.statusCode === 401) {
			error.value = t('Wrong passcode.');
		} else {
			error.value = t('The portal is not available right now.');
		}
		pin.value = [];
	} finally {
		checking.value = false;
	}
}

async function leave() {
	await $fetch('/api/portal/logout', { method: 'POST' }).catch(() => {});
	channels.value = [];
	selected.value = null;
	pin.value = [];
	phase.value = 'locked';
}

onMounted(start);
</script>

<template>
	<div class="min-h-dvh bg-default text-default">
		<header class="border-b border-default">
			<UContainer class="flex h-14 items-center justify-between gap-3">
				<div class="flex min-w-0 items-center gap-2">
					<img :src="appConfig.brand.logo" alt="" class="size-8 shrink-0" />
					<span class="truncate font-semibold text-highlighted">{{ title || appConfig.brand.name }}</span>
				</div>
				<div class="flex items-center gap-1">
					<UColorModeButton />
					<UButton v-if="phase === 'open'" icon="i-lucide-log-out" color="neutral" variant="ghost" :label="$t('Leave')" @click="leave" />
				</div>
			</UContainer>
		</header>

		<UContainer class="py-8">
			<div v-if="phase === 'loading'" class="flex justify-center py-24 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
			</div>

			<UEmpty v-else-if="phase === 'disabled'" class="py-24" icon="i-lucide-tv-minimal" :title="$t('The View Portal is not available.')" />

			<div v-else-if="phase === 'locked'" class="mx-auto flex max-w-sm flex-col items-center gap-6 py-16 text-center">
				<UIcon name="i-lucide-lock-keyhole" class="size-10 text-primary" />
				<div class="space-y-1">
					<h1 class="text-xl font-semibold text-highlighted">{{ $t('Enter the passcode') }}</h1>
					<p class="text-sm text-muted">{{ $t('Enter the 6-digit passcode you were given to watch.') }}</p>
				</div>

				<form class="flex flex-col items-center gap-4" @submit.prevent="submit">
					<UPinInput
						v-model="pin"
						:length="6"
						type="number"
						otp
						mask
						autofocus
						size="xl"
						:disabled="checking"
						:aria-label="$t('Passcode')"
						@complete="submit"
					/>
					<UAlert v-if="error" color="error" variant="subtle" icon="i-lucide-circle-alert" :title="error" class="text-left" />
					<UButton type="submit" block size="lg" :loading="checking" :disabled="pin.join('').length !== 6" :label="$t('Watch')" />
				</form>
			</div>

			<div v-else class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
				<UEmpty v-if="!selected" class="py-24 lg:col-span-2" icon="i-lucide-tv-minimal" :title="$t('No channels are available yet.')" />

				<template v-else>
					<section class="min-w-0 space-y-3">
						<HlsPlayer :key="selected.channelid" :src="selected.manifest" :poster="selected.poster" autoplay />
						<h1 class="text-lg font-semibold text-highlighted">{{ selected.name || selected.channelid }}</h1>
					</section>

					<nav class="space-y-2" :aria-label="$t('Channels')">
						<h2 class="text-sm font-medium text-muted">{{ $t('Channels') }}</h2>
						<UButton
							v-for="channel in channels"
							:key="channel.channelid"
							block
							size="lg"
							class="justify-start"
							icon="i-lucide-tv"
							:color="channel.channelid === selected.channelid ? 'primary' : 'neutral'"
							:variant="channel.channelid === selected.channelid ? 'solid' : 'subtle'"
							:label="channel.name || channel.channelid"
							@click="selected = channel"
						/>
					</nav>
				</template>
			</div>
		</UContainer>
	</div>
</template>
