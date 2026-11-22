<script setup lang="ts">
// The app opens on the channel the core client considers current (the first one on a fresh core).
const { api } = useRestreamer();

await navigateTo(`/${api().GetCurrentChannelID()}`, { replace: true });
</script>

<template>
	<UDashboardPanel />
</template>
