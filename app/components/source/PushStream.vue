<script setup lang="ts">
import * as S from '#shared/sources/network';
import type { SourceDevice } from '#shared/sources/types';

// The stream of an internal server to ingest: one that is already published there, or the address
// to send a stream to (legacy PushRTMP / PushSRT of Edit/Sources/Network.js and the wizard's
// InternalRTMP / InternalSRT).
const props = defineProps<{
	protocol: 'rtmp' | 'srt';
	/** The network source config with its defaults (`initConfig`). */
	config: S.Config;
	/** `settings.push.name` */
	name: string;
	knownDevices: SourceDevice[];
}>();

const emit = defineEmits<{ 'update:name': [name: string]; refresh: [] }>();

const { t } = useI18n();

// Only an explicit `false` counts as disabled, as in legacy.
const enabled = computed(() => props.config[props.protocol].enabled !== false);

const address = computed(() => (props.protocol === 'rtmp' ? S.getRTMP(props.config) : S.getSRT(props.config)));

const items = computed(() => [
	{ value: 'none', label: t('Choose an input stream ...'), disabled: true },
	...props.knownDevices.filter((device) => device.media === props.protocol).map((device) => ({ value: device.id, label: device.name })),
	{ value: props.config.channelid, label: t('Send stream to address ...') },
]);
</script>

<template>
	<div v-if="!enabled" class="space-y-4">
		<p>{{ protocol === 'rtmp' ? $t('RTMP server is not enabled') : $t('SRT server is not enabled') }}</p>
		<UButton
			:to="`/settings/${protocol}`"
			variant="outline"
			size="lg"
			block
			:label="protocol === 'rtmp' ? $t('Enable RTMP server ...') : $t('Enable SRT server ...')"
		/>
	</div>

	<div v-else class="space-y-4">
		<div>
			<UFormField :label="$t('Input stream')">
				<USelect :model-value="name" :items="items" class="w-full" @update:model-value="(v) => emit('update:name', String(v))" />
			</UFormField>
			<div class="flex justify-end">
				<UButton size="xs" variant="ghost" icon="i-lucide-refresh-cw" :label="$t('Refresh')" @click="emit('refresh')" />
			</div>
		</div>

		<PlayerCopyField v-if="name === config.channelid" :label="$t('Address:')" :value="address" />
	</div>
</template>
