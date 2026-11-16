<script setup lang="ts">
// A read-only value with a copy button (legacy misc/TextFieldCopy.js).
const props = defineProps<{ label: string; value: string }>();

const { t } = useI18n();
const toast = useToast();

async function copy() {
	try {
		await navigator.clipboard.writeText(props.value);
		toast.add({ title: t('Data copied to clipboard'), color: 'success' });
	} catch {
		toast.add({ title: t('Error while copying data to clipboard'), color: 'error' });
	}
}
</script>

<template>
	<UFormField :label="label">
		<UInput :model-value="value" readonly class="w-full font-mono" :ui="{ trailing: 'pe-1' }" @focus="($event.target as HTMLInputElement).select()">
			<template #trailing>
				<UButton icon="i-lucide-copy" color="neutral" variant="ghost" size="sm" :aria-label="$t('Copy')" @click="copy" />
			</template>
		</UInput>
	</UFormField>
</template>
