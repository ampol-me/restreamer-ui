<script setup lang="ts">
import { checkUpload, type UploadError, type UploadType } from '#shared/player/upload';

// Picks one file, checks it against the accepted types and hands its bytes to the parent, which
// does the actual upload through the core client (legacy misc/UploadButton.js).
const props = defineProps<{ label: string; acceptTypes: UploadType[]; disabled?: boolean }>();

const emit = defineEmits<{
	start: [];
	upload: [data: ArrayBuffer, extension: string, mimetype: string];
	error: [error: UploadError];
}>();

const input = ref<HTMLInputElement | null>(null);
const accept = computed(() => props.acceptTypes.map((t) => t.mimetype).join(','));

async function onChange(event: Event) {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	// Otherwise picking the same file again would not fire a change event.
	target.value = '';

	emit('start');

	const check = checkUpload(file, props.acceptTypes);
	if (!check.ok || !file) {
		emit('error', check.ok ? { type: 'nofiles' } : check.error);
		return;
	}

	let data: ArrayBuffer;
	try {
		data = await file.arrayBuffer();
	} catch (e: unknown) {
		emit('error', { type: 'read', message: e instanceof Error ? e.message : String(e) });
		return;
	}

	emit('upload', data, check.type.extension, check.type.mimetype);
}
</script>

<template>
	<span class="inline-flex">
		<UButton icon="i-lucide-upload" color="neutral" variant="outline" :label="label" :disabled="disabled" @click="input?.click()" />
		<input ref="input" type="file" class="hidden" :accept="accept" @change="onChange" />
	</span>
</template>
