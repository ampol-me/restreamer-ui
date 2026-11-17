<script setup lang="ts">
// The viewer site. It never touches the core: everything goes through this server's
// /api/viewer/* routes, which decide per channel who may watch and proxy the streams.
import type { ViewerChannel } from '~/components/viewer/Page.vue';
import type { Template } from '#shared/viewer/template';

definePageMeta({ layout: false });

interface Site {
	enabled: boolean;
	title: string;
	background: string;
	template: Template | null;
	channels: ViewerChannel[];
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const phase = ref<'loading' | 'unavailable' | 'ready'>('loading');
const site = ref<Site | null>(null);
const selectedId = ref<string | null>(null);
const checking = ref(false);
const error = ref('');

useHead({ title: () => site.value?.title || t('Live') });

async function load() {
	try {
		const data = await $fetch<Site>('/api/viewer/site');
		site.value = data;
		if (!data.enabled || !data.template) {
			phase.value = 'unavailable';
			return;
		}
		// ?channel=<id> links straight to a channel.
		const wanted = selectedId.value ?? (typeof route.query.channel === 'string' ? route.query.channel : null);
		selectedId.value = data.channels.find((c) => c.channelid === wanted)?.channelid ?? data.channels[0]?.channelid ?? null;
		phase.value = 'ready';
	} catch {
		phase.value = 'unavailable';
	}
}

function select(channelid: string) {
	selectedId.value = channelid;
	error.value = '';
	void router.replace({ query: { ...route.query, channel: channelid } });
}

async function unlock(channelid: string, passcode: string) {
	checking.value = true;
	error.value = '';
	try {
		await $fetch('/api/viewer/unlock', { method: 'POST', body: { channelid, passcode } });
		await load();
	} catch (e: unknown) {
		const err = e as { statusCode?: number; data?: { data?: { retryAfter?: number; reason?: string } } };
		const reason = err.data?.data?.reason;
		if (err.statusCode === 429) {
			error.value = t('Too many attempts. Try again in {minutes} minutes.', { minutes: Math.ceil((err.data?.data?.retryAfter ?? 600) / 60) });
		} else if (reason === 'wrong') {
			error.value = t('Wrong passcode.');
		} else if (reason === 'expired') {
			error.value = t('The passcode for this channel has expired.');
		} else if (reason === 'exhausted') {
			error.value = t('This passcode has been used the maximum number of times.');
		} else if (reason === 'full') {
			error.value = t('The maximum number of viewers is watching right now. Try again later.');
		} else {
			error.value = t('This channel is not available right now.');
		}
	} finally {
		checking.value = false;
	}
}

async function leave() {
	await $fetch('/api/viewer/leave', { method: 'POST' }).catch(() => {});
	await load();
}

onMounted(load);
</script>

<template>
	<div v-if="phase === 'loading'" class="flex min-h-dvh items-center justify-center bg-default text-muted">
		<UIcon name="i-lucide-loader-circle" class="size-8 animate-spin" />
	</div>

	<div v-else-if="phase === 'unavailable' || !site?.template" class="flex min-h-dvh flex-col items-center justify-center gap-6 bg-default">
		<BrandLockup :title="site?.title" />
		<UEmpty icon="i-lucide-tv-minimal" :title="$t('This page is not available.')" />
	</div>

	<ViewerPage
		v-else
		:title="site.title"
		:background="site.background"
		:template="site.template"
		:channels="site.channels"
		:selected-id="selectedId"
		:checking="checking"
		:error="error"
		@select="select"
		@unlock="unlock"
		@leave="leave"
	/>
</template>
