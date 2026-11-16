<script setup lang="ts">
// A secret that can be revealed while typing, like the legacy password fields.
defineProps<{ disabled?: boolean; maxlength?: number }>();

const model = defineModel<string>({ required: true });

const show = ref(false);
</script>

<template>
	<UInput v-model="model" class="w-full" :type="show ? 'text' : 'password'" autocomplete="off" :disabled="disabled" :maxlength="maxlength">
		<template #trailing>
			<UButton
				color="neutral"
				variant="link"
				size="sm"
				:icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
				:aria-label="show ? $t('Hide') : $t('Show')"
				:aria-pressed="show"
				:disabled="disabled"
				@click="show = !show"
			/>
		</template>
	</UInput>
</template>
