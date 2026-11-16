<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';

const { t, locale, locales, setLocale } = useI18n();
const appConfig = useAppConfig();
const asset = useAsset();
const route = useRoute();
const toast = useToast();
const { state, api, sync, logout } = useRestreamer();

const channelItems = computed<NavigationMenuItem[]>(() =>
	state.value.channels.map((channel) => ({
		label: channel.name || t('Main channel'),
		icon: 'i-lucide-tv',
		to: `/${channel.channelid}`,
		active: route.params.channelid === channel.channelid,
	})),
);

const menuItems = computed<NavigationMenuItem[]>(() => [
	{ label: t('Playersite'), icon: 'i-lucide-monitor-play', to: '/playersite', disabled: !state.value.ingest },
	{ label: t('View Portal'), icon: 'i-lucide-lock-keyhole', to: '/settings/portal' },
	{ label: t('System'), icon: 'i-lucide-settings', to: '/settings', exact: true },
]);

const linkItems = computed<NavigationMenuItem[]>(() => [
	{ label: t('Docs'), icon: 'i-lucide-circle-help', to: 'https://docs.datarhei.com/restreamer', target: '_blank' },
	{ label: t('Bug report'), icon: 'i-lucide-bug', to: 'https://github.com/datarhei/restreamer/issues', target: '_blank' },
]);

const languages = computed(() => locales.value.map((l) => ({ label: l.name ?? l.code, value: l.code })));

// New channel
const createOpen = ref(false);
const createName = ref('');
const creating = ref(false);

async function createChannel() {
	creating.value = true;
	try {
		const channelid = api().CreateChannel(createName.value.trim());
		sync();
		createOpen.value = false;
		createName.value = '';
		await navigateTo(`/${channelid}`);
	} catch {
		toast.add({ title: t('The channel could not be created.'), color: 'error' });
	} finally {
		creating.value = false;
	}
}
</script>

<template>
	<UDashboardGroup>
		<UDashboardSidebar collapsible resizable :ui="{ footer: 'flex-col items-stretch gap-2' }">
			<template #header="{ collapsed }">
				<NuxtLink to="/" class="flex min-w-0 items-center gap-2">
					<img :src="asset(appConfig.brand.logo)" alt="" class="size-8 shrink-0" />
					<span v-if="!collapsed" class="truncate font-semibold text-highlighted">{{ appConfig.brand.name }}</span>
				</NuxtLink>
			</template>

			<template #default="{ collapsed }">
				<div v-if="!collapsed" class="flex items-center justify-between px-2.5 pt-1">
					<span class="text-xs font-medium text-muted">{{ $t('Channels') }}</span>
					<UButton icon="i-lucide-plus" size="xs" color="neutral" variant="ghost" :aria-label="$t('Add channel')" @click="createOpen = true" />
				</div>
				<UNavigationMenu :collapsed="collapsed" :items="channelItems" orientation="vertical" />

				<USeparator class="my-2" />
				<UNavigationMenu :collapsed="collapsed" :items="menuItems" orientation="vertical" />

				<UNavigationMenu :collapsed="collapsed" :items="linkItems" orientation="vertical" class="mt-auto" />
			</template>

			<template #footer="{ collapsed }">
				<USelect
					v-if="!collapsed"
					:model-value="locale"
					:items="languages"
					icon="i-lucide-languages"
					:aria-label="$t('Language')"
					@update:model-value="(code) => setLocale(code)"
				/>
				<div class="flex items-center gap-1" :class="collapsed ? 'flex-col' : 'justify-between'">
					<UColorModeButton />
					<UButton
						icon="i-lucide-log-out"
						color="neutral"
						variant="ghost"
						:label="collapsed ? undefined : $t('Logout')"
						:aria-label="$t('Logout')"
						@click="logout()"
					/>
				</div>
				<p v-if="!collapsed" class="truncate text-xs text-dimmed">{{ state.name }} · core {{ state.version }}</p>
			</template>
		</UDashboardSidebar>

		<slot />

		<UModal v-model:open="createOpen" :title="$t('Add channel')">
			<template #body>
				<form id="create-channel" @submit.prevent="createChannel">
					<UFormField :label="$t('Channel name')">
						<UInput v-model="createName" class="w-full" autofocus maxlength="100" />
					</UFormField>
				</form>
			</template>
			<template #footer>
				<UButton color="neutral" variant="ghost" :label="$t('Abort')" @click="createOpen = false" />
				<UButton type="submit" form="create-channel" :loading="creating" :disabled="createName.trim().length === 0" :label="$t('Add')" />
			</template>
		</UModal>
	</UDashboardGroup>
</template>
