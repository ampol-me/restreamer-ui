<script setup lang="ts">
// The viewer page of one channel (/watch/a4ff4073): no channel list, nothing about the others.
definePageMeta({ layout: false });

const route = useRoute();
</script>

<template>
	<ViewerSite :key="String(route.params.channel)" :only="String(route.params.channel)" />
</template>
