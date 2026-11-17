<script setup lang="ts">
// A read-only value with a copy button (legacy misc/TextFieldCopy.js).
// `secret`: the value is masked until the user asks to see it (stream keys); copying works either way.
const props = defineProps<{ label: string; value: string; secret?: boolean }>();

const revealed = ref(false);

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
		<UInput
			:model-value="value"
			:type="secret && !revealed ? 'password' : 'text'"
			readonly
			class="w-full font-mono"
			:ui="{ trailing: 'pe-1' }"
			@focus="($event.target as HTMLInputElement).select()"
		>
			<template #trailing>
				<UButton
					v-if="secret"
					:icon="revealed ? 'i-lucide-eye-off' : 'i-lucide-eye'"
					color="neutral"
					variant="ghost"
					size="sm"
					:aria-label="revealed ? $t('Hide') : $t('Show')"
					:aria-pressed="revealed"
					@click="revealed = !revealed"
				/>
				<UButton icon="i-lucide-copy" color="neutral" variant="ghost" size="sm" :aria-label="$t('Copy')" @click="copy" />
			</template>
		</UInput>
	</UFormField>
</template>
