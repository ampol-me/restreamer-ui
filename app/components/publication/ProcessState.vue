<script setup lang="ts">
import type { ProcessProgress } from '#shared/core/types';
import { anonymize } from '#shared/core/anonymizer';
import { formatUptime } from '~/utils/format';

// What the publication process is doing right now, and the one action that makes sense in that state.
const props = defineProps<{ progress: ProcessProgress }>();

const emit = defineEmits<{ action: [action: 'connect' | 'disconnect' | 'reconnect'] }>();

const { t } = useI18n();

// "Connected since <0/>": the catalogs mark where the duration goes.
const connectedSince = computed(() => t('Connected since <0/>').replace('<0/>', formatUptime(props.progress.time)));

const action = computed<'connect' | 'disconnect' | 'reconnect' | null>(() => {
	const { state, reconnect, order } = props.progress;

	if (state === 'connecting' || state === 'disconnecting') {
		return null;
	}
	if (state === 'connected') {
		return 'disconnect';
	}
	// The core is about to restart the process by itself; all there is to do is to call that off.
	if (reconnect >= 0) {
		return 'disconnect';
	}
	if (state === 'error') {
		return 'reconnect';
	}
	return order === 'start' ? 'reconnect' : 'connect';
});
</script>

<template>
	<div class="space-y-3">
		<UAlert v-if="progress.state === 'connecting'" color="neutral" variant="subtle" icon="i-lucide-loader-circle" :title="$t('Connecting ...')" />
		<UAlert
			v-else-if="progress.state === 'disconnecting'"
			color="neutral"
			variant="subtle"
			icon="i-lucide-loader-circle"
			:title="$t('Disconnecting ...')"
		/>
		<UAlert v-else-if="progress.state === 'connected'" color="success" variant="subtle" icon="i-lucide-radio" :title="connectedSince" />
		<UAlert
			v-else-if="progress.state === 'error'"
			color="error"
			variant="subtle"
			icon="i-lucide-triangle-alert"
			:title="progress.error === '' ? $t('Error') : $t('Error: {0}', [anonymize(progress.error)])"
			:description="progress.reconnect !== -1 ? $t('Reconnecting in {0}s', [progress.reconnect]) : $t('You have to reconnect manually')"
		/>
		<UAlert
			v-else-if="progress.reconnect !== -1"
			color="neutral"
			variant="subtle"
			icon="i-lucide-refresh-cw"
			:title="$t('Reconnecting in {0}s', [progress.reconnect])"
		/>

		<UButton
			v-if="action === null"
			block
			size="lg"
			color="neutral"
			variant="outline"
			disabled
			:label="$t(progress.state === 'connecting' ? 'Connecting ...' : 'Disconnecting ...')"
		/>
		<UButton
			v-else-if="action === 'disconnect'"
			block
			size="lg"
			color="error"
			variant="outline"
			icon="i-lucide-square"
			:label="$t('Disconnect')"
			@click="emit('action', 'disconnect')"
		/>
		<UButton v-else-if="action === 'reconnect'" block size="lg" icon="i-lucide-refresh-cw" :label="$t('Reconnect')" @click="emit('action', 'reconnect')" />
		<UButton v-else block size="lg" icon="i-lucide-play" :label="$t('Connect')" @click="emit('action', 'connect')" />
	</div>
</template>
