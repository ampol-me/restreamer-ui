<script setup lang="ts">
const { state, init } = useRestreamer();
const route = useRoute();
const asset = useAsset();

// Icons from the Phila brand kit; resolved against the app's base URL (it may be a sub-path).
useHead({
	link: [
		{ rel: 'icon', href: asset('favicon.ico'), sizes: 'any' },
		{ rel: 'icon', href: asset('favicon.svg'), type: 'image/svg+xml' },
		{ rel: 'apple-touch-icon', href: asset('apple-touch-icon.png') },
	],
});

// The View Portal is for viewers: it must work without (and never trigger) a core login.
const isPortal = computed(() => route.path === '/portal' || route.path.startsWith('/portal/'));

onMounted(() => {
	if (!isPortal.value) void init();
});

// …and navigating from the portal into the admin UI starts the core session then.
watch(isPortal, (portal) => {
	if (!portal) void init();
});

// Same gating order as the legacy UI: reachability, login, compatibility, then the app.
const gate = computed(() => {
	if (!state.value.initialized) return 'initializing';
	if (!state.value.valid) return 'invalid';
	if (!state.value.connected) return 'login';
	if (state.value.compatibility && !state.value.compatibility.compatible) return 'incompatible';
	return 'app';
});
</script>

<template>
	<UApp>
		<NuxtPage v-if="isPortal" />

		<NuxtLayout v-else-if="gate === 'app'">
			<NuxtPage />
		</NuxtLayout>

		<!-- Everything before the app proper is a single centred card on the brand header. -->
		<div v-else class="min-h-dvh bg-default">
			<header class="border-b border-default">
				<UContainer class="flex h-14 items-center justify-between">
					<BrandLockup />
					<UColorModeButton />
				</UContainer>
			</header>
			<UContainer class="py-6">
				<GateInitializing v-if="gate === 'initializing'" />
				<GateInvalid v-else-if="gate === 'invalid'" :address="state.address" />
				<GateLogin v-else-if="gate === 'login'" />
				<GateIncompatible v-else :compatibility="state.compatibility!" />
			</UContainer>
		</div>
	</UApp>
</template>
