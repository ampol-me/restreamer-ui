<script setup lang="ts">
// A picture for the viewer page: an address typed in, or a file uploaded to this server.
import { isUploadedImage } from '#shared/viewer/template';

const model = defineModel<string>({ required: true });
const props = defineProps<{ upload: (file: File) => Promise<string | null> }>();

const asset = useAsset();
const input = ref<HTMLInputElement | null>(null);
const busy = ref(false);

const uploaded = computed(() => isUploadedImage(model.value));
const preview = computed(() => (uploaded.value ? asset(model.value) : model.value));

async function picked(event: Event) {
	const target = event.target as HTMLInputElement;
	const file = target.files?.[0];
	// The same file can be chosen again after a failed upload.
	target.value = '';
	if (!file) return;

	busy.value = true;
	try {
		const url = await props.upload(file);
		if (url) model.value = url;
	} finally {
		busy.value = false;
	}
}
</script>

<template>
	<div class="space-y-2">
		<div class="flex items-center gap-2">
			<div v-if="uploaded" class="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-sm border border-accented bg-default px-3 text-sm text-muted">
				<UIcon name="i-lucide-image" class="size-4 shrink-0" />
				<span class="truncate">{{ $t('Uploaded picture') }}</span>
			</div>
			<UInput v-else v-model="model" type="url" class="min-w-0 flex-1" placeholder="https://…" />

			<input ref="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="hidden" @change="picked" />
			<UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="busy" :label="$t('Upload')" @click="input?.click()" />
			<UButton v-if="model" color="neutral" variant="ghost" icon="i-lucide-x" :aria-label="$t('Remove the picture')" @click="model = ''" />
		</div>
		<img v-if="preview" :src="preview" alt="" class="max-h-24 rounded-sm border border-default" />
	</div>
</template>
