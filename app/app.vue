<script setup lang="ts">
const { state, init } = useRestreamer();

onMounted(init);

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
		<NuxtLayout>
			<GateInitializing v-if="gate === 'initializing'" />
			<GateInvalid v-else-if="gate === 'invalid'" :address="state.address" />
			<GateLogin v-else-if="gate === 'login'" />
			<GateIncompatible v-else-if="gate === 'incompatible'" :compatibility="state.compatibility!" />
			<NuxtPage v-else />
		</NuxtLayout>
	</UApp>
</template>
