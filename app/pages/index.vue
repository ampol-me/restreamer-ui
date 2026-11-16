<script setup lang="ts">
const { state } = useRestreamer();
</script>

<template>
	<div class="space-y-4">
		<h1 class="text-xl font-semibold text-highlighted">{{ $t('Channels') }}</h1>

		<UEmpty v-if="state.channels.length === 0" icon="i-lucide-tv" :title="$t('No channels yet')" />

		<div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			<UCard v-for="channel in state.channels" :key="channel.channelid">
				<p class="font-medium text-highlighted">{{ channel.name || channel.channelid }}</p>
				<p class="text-sm text-muted">{{ $t('{n} publications', { n: channel.egresses.length }) }}</p>
			</UCard>
		</div>
	</div>
</template>
