<script setup lang="ts">
import { uploadErrorMessage, type UploadError } from '#shared/player/upload';

// Tells why a picked file was not uploaded.
const props = defineProps<{ title: string; error: UploadError | null }>();
const open = defineModel<boolean>('open', { required: true });

const { t } = useI18n();

const message = computed(() => (props.error ? uploadErrorMessage(props.error, (text, values) => t(text, values ?? [])) : ''));
</script>

<template>
	<UModal v-model:open="open" :title="title">
		<template #body>
			<p>{{ message }}</p>
		</template>
		<template #footer>
			<UButton class="ml-auto" :label="$t('OK')" @click="open = false" />
		</template>
	</UModal>
</template>
