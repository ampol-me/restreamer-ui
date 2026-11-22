<script setup lang="ts">
import { summarizeTrack } from '#shared/ingest/summary';
import type { MetadataProfileTrack, MetadataSource } from '#shared/metadata';

// Read-only summary of the video or audio half of a channel's profile.
const props = defineProps<{
	type: 'video' | 'audio';
	sources: MetadataSource[];
	track: MetadataProfileTrack;
	// Display name of a source type (from the sources registry).
	sourceName: (type: string) => string;
}>();

const summary = computed(() => summarizeTrack(props.type, props.sources, props.track));
</script>

<template>
	<dl class="space-y-3 rounded-lg bg-elevated p-4 text-sm">
		<div>
			<dt class="font-medium text-highlighted">{{ summary.selected ? $t(sourceName(summary.sourceType)) : $t('No source selected') }}</dt>
			<dd v-if="summary.address" class="break-all text-muted">{{ summary.address }}</dd>
		</div>
		<template v-if="summary.selected">
			<div>
				<dt class="font-medium text-highlighted">{{ $t('Encoding') }}</dt>
				<dd class="text-muted">{{ summary.encoding ?? $t('None') }}</dd>
			</div>
			<div>
				<dt class="font-medium text-highlighted">{{ $t('Filter') }}</dt>
				<dd class="text-muted">{{ summary.filters.length ? summary.filters.join(', ') : $t('None') }}</dd>
			</div>
		</template>
	</dl>
</template>
