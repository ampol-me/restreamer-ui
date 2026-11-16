<script setup lang="ts">
// The anonymised debug report of a process (what the legacy UI calls "Process report").
const props = defineProps<{ title: string; load: () => Promise<unknown>; filename: string }>();

const open = defineModel<boolean>('open', { default: false });

const text = ref('');
const loading = ref(false);

watch(open, async (isOpen) => {
	if (!isOpen) return;
	loading.value = true;
	try {
		text.value = JSON.stringify(await props.load(), null, 2);
	} finally {
		loading.value = false;
	}
});

function download() {
	const url = URL.createObjectURL(new Blob([text.value], { type: 'application/json' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = props.filename;
	a.click();
	URL.revokeObjectURL(url);
}
</script>

<template>
	<UModal v-model:open="open" :title="title" :ui="{ content: 'sm:max-w-3xl' }">
		<template #body>
			<div v-if="loading" class="flex justify-center py-10 text-muted">
				<UIcon name="i-lucide-loader-circle" class="size-6 animate-spin" />
			</div>
			<pre v-else class="max-h-[60vh] overflow-auto rounded-md bg-elevated p-3 font-mono text-xs">{{ text }}</pre>
		</template>
		<template #footer>
			<UButton icon="i-lucide-download" color="neutral" variant="subtle" :disabled="loading" :label="$t('Download')" @click="download" />
		</template>
	</UModal>
</template>
