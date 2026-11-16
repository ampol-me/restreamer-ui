<script setup lang="ts">
import type { IngestMetadata } from '#shared/metadata';

// Name/description of the channel and its author, shown on the player and playersite.
type Meta = IngestMetadata['meta'];

const meta = defineModel<Meta>({ required: true });

const tab = ref('content');

const set = (values: Partial<Meta>) => (meta.value = { ...meta.value, ...values });
const setAuthor = (values: Partial<Meta['author']>) => set({ author: { ...meta.value.author, ...values } });
</script>

<template>
	<UTabs
		v-model="tab"
		:items="[
			{ label: $t('Content'), value: 'content', slot: 'content' },
			{ label: $t('Author'), value: 'author', slot: 'author' },
		]"
		variant="link"
	>
		<template #content>
			<div class="space-y-4 pt-2">
				<UFormField :label="$t('Name')">
					<UInput :model-value="meta.name" class="w-full" maxlength="200" @update:model-value="(v) => set({ name: String(v) })" />
				</UFormField>
				<UFormField :label="$t('Description')">
					<UTextarea :model-value="meta.description" :rows="4" class="w-full" @update:model-value="(v) => set({ description: String(v) })" />
				</UFormField>
			</div>
		</template>

		<template #author>
			<div class="space-y-4 pt-2">
				<UFormField :label="$t('Name')">
					<UInput :model-value="meta.author.name" class="w-full" maxlength="200" @update:model-value="(v) => setAuthor({ name: String(v) })" />
				</UFormField>
				<UFormField :label="$t('Description')">
					<UTextarea
						:model-value="meta.author.description"
						:rows="4"
						class="w-full"
						@update:model-value="(v) => setAuthor({ description: String(v) })"
					/>
				</UFormField>
			</div>
		</template>
	</UTabs>
</template>
