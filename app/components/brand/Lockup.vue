<script setup lang="ts">
// Product lockup: the mark, "PHILA" in the label style above the product name in bold.
defineProps<{ collapsed?: boolean; title?: string }>();

const appConfig = useAppConfig();
</script>

<template>
	<span class="flex min-w-0 items-center gap-2">
		<BrandMark :size="32" />
		<span v-if="!collapsed" class="flex min-w-0 flex-col leading-none">
			<span class="ph-label text-muted">Phila</span>
			<span class="truncate text-base leading-5 font-bold text-highlighted">{{ title || appConfig.brand.product }}</span>
		</span>
	</span>
</template>
