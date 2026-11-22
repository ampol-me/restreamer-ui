<script setup lang="ts">
import * as S from '#shared/sources/videoloop';
import type { UploadError } from '#shared/player/upload';
import type { SourceDevice, SourceInput, SourceSettings } from '#shared/sources/types';

// Port of legacy/src/views/Edit/Sources/VideoLoop.js
const props = withDefaults(
	defineProps<{
		settings?: SourceSettings;
		config?: Record<string, unknown>;
		skills?: Record<string, unknown> | null;
		knownDevices?: SourceDevice[];
		/**
		 * Stores the picked file for the channel and resolves to its path (legacy `onStore(name, data)`).
		 * Being an `on…` prop it can be bound as `@store="handler"`; the handler's result is awaited.
		 */
		onStore?: (name: string, data: ArrayBuffer) => Promise<string> | string;
	}>(),
	{ settings: () => ({}), config: () => ({}), skills: null, knownDevices: () => [], onStore: undefined },
);

const emit = defineEmits<{
	'update:settings': [settings: SourceSettings];
	probe: [settings: SourceSettings, inputs: SourceInput[]];
	refresh: [];
}>();

const settings = computed(() => S.initSettings(props.settings));

const saving = ref(false);
const error = ref<UploadError | null>(null);
const errorOpen = ref(false);

function fail(err: UploadError) {
	saving.value = false;
	error.value = err;
	errorOpen.value = true;
}

async function upload(data: ArrayBuffer, _extension: string, mimetype: string) {
	try {
		// Without a handler the path is empty, as with the legacy default `onStore`.
		const path = props.onStore ? await props.onStore(S.storeName, data) : '';

		emit('update:settings', { ...settings.value, address: path, mimetype });
		saving.value = false;
	} catch (e: unknown) {
		fail({ type: 'read', message: e instanceof Error ? e.message : String(e) });
	}
}

function probe() {
	emit('probe', settings.value, S.createInputs(settings.value));
}
</script>

<template>
	<div class="space-y-4">
		<p class="text-sm text-muted">
			{{ $t('Upload an image or video file ({0}) in order to loop it.', [S.acceptTypes.map((type) => type.mimetype).join(', ')]) }}
		</p>
		<div class="flex items-end gap-4">
			<UFormField :label="$t('File path')" class="flex-1">
				<UInput :model-value="settings.address" readonly class="w-full" />
			</UFormField>
			<PlayerUploadButton :label="$t('Upload')" :accept-types="S.acceptTypes" @start="saving = true" @error="fail" @upload="upload" />
		</div>
		<UButton :label="$t('Probe')" :disabled="!settings.address.length" @click="probe" />

		<PlayerBusy :active="saving" />
		<PlayerUploadError v-model:open="errorOpen" :title="$t('Uploading the file failed')" :error="error" />
	</div>
</template>
