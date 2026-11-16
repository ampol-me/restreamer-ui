<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';

const { t } = useI18n();
const { state, logout } = useRestreamer();

const signedIn = computed(() => state.value.initialized && state.value.connected);

const menu = computed<DropdownMenuItem[][]>(() => [
	[
		{ label: t('Channels'), icon: 'i-lucide-tv', to: '/' },
		{ label: t('Playersite'), icon: 'i-lucide-monitor-play', to: '/playersite', disabled: !state.value.ingest },
		{ label: t('System'), icon: 'i-lucide-settings', to: '/settings' },
	],
	[
		{ label: t('Docs'), icon: 'i-lucide-circle-help', to: 'https://docs.datarhei.com/restreamer', target: '_blank' },
		{ label: t('Bug report'), icon: 'i-lucide-bug', to: 'https://github.com/datarhei/restreamer/issues', target: '_blank' },
	],
	[{ label: t('Logout'), icon: 'i-lucide-log-out', onSelect: () => void logout() }],
]);
</script>

<template>
	<div class="min-h-dvh bg-default">
		<UHeader :toggle="false" to="/">
			<template #title>
				<span class="font-semibold text-highlighted">Restreamer</span>
			</template>

			<template #right>
				<UColorModeButton />
				<UDropdownMenu v-if="signedIn" :items="menu">
					<UButton icon="i-lucide-menu" color="neutral" variant="ghost" :aria-label="$t('Menu')" />
				</UDropdownMenu>
			</template>
		</UHeader>

		<UMain>
			<UContainer class="py-6">
				<slot />
			</UContainer>
		</UMain>
	</div>
</template>
