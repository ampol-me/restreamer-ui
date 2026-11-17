<script setup lang="ts">
// Where viewers watch one channel on the viewer site, and who may: shown where the channel's
// player is set up, so the link does not have to be looked for under "Viewer site".
import { shortId } from '#shared/viewer/link';

const props = defineProps<{ channelid: string }>();

const { t } = useI18n();
const { accessToken } = useRestreamer();
const asset = useAsset();

type Access = 'public' | 'passcode' | 'hidden';
// null until the settings are loaded; 'off' when the viewer site is switched off.
const access = ref<Access | 'off' | null>(null);

const url = computed(() => `${window.location.origin}${asset('watch')}/${shortId(props.channelid)}`);

const status = computed(() => {
	switch (access.value) {
		case 'public':
			return { state: 'ready' as const, label: t('Public'), text: t('Anyone with the link can watch.') };
		case 'passcode':
			return { state: 'ready' as const, label: t('Passcode'), text: t('Viewers enter the passcode of this channel.') };
		case 'off':
			return { state: 'off' as const, label: t('Off'), text: t('The viewer site is switched off.') };
		default:
			return { state: 'off' as const, label: t('Hidden'), text: t('This channel is not on the viewer site yet.') };
	}
});

async function load() {
	try {
		const token = await accessToken();
		const config = await $fetch<{ enabled: boolean; channels: { channelid: string; access: Access }[] }>('/api/viewer/config', {
			headers: token ? { Authorization: `Bearer ${token}` } : {},
		});
		access.value = config.enabled ? (config.channels.find((c) => c.channelid === props.channelid)?.access ?? 'hidden') : 'off';
	} catch {
		// Without the settings the link is still right; only the status line is left out.
		access.value = null;
	}
}

onMounted(load);
watch(() => props.channelid, load);
</script>

<template>
	<section class="space-y-3 rounded-lg border border-default bg-elevated p-4" :aria-label="$t('Viewer page')">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<h2 class="font-semibold text-highlighted">{{ $t('Viewer page') }}</h2>
			<TallyBadge v-if="access !== null" :state="status.state" :label="status.label" />
		</div>
		<p class="text-sm text-muted">
			{{ $t('The page of this channel on your viewer site.') }}
			<template v-if="access !== null">{{ status.text }}</template>
		</p>
		<PlayerCopyField v-if="access === 'public' || access === 'passcode' || access === null" :label="$t('Link for viewers')" :value="url" />
		<UButton color="neutral" variant="outline" icon="i-lucide-key-round" :label="$t('Who can watch and how the page looks')" to="/viewers" />
	</section>
</template>
