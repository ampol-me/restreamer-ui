<script setup lang="ts">
import type { FormNumber } from '#shared/settings/config';

// A number of the settings form. The input yields a number, or '' while it is empty (see toInt).
defineProps<{ disabled?: boolean }>();

const model = defineModel<FormNumber>({ required: true });
</script>

<template>
	<UInput v-model.number="model" type="number" class="w-full" :disabled="disabled" />
</template>
