<script setup lang="ts">
import type { FilterRegistry } from '#shared/coders/types';
import * as Filters from '#shared/filters';
import { getFilterFields } from '#shared/filters/fields';
import type { MetadataFilter, MetadataProfileTrack } from '#shared/metadata';

// Port of legacy/src/misc/FilterSelect.js: the optional filters of one track of a profile.
const props = defineProps<{
	type: 'video' | 'audio';
	profile: MetadataProfileTrack;
	// Filters the core's FFmpeg knows (skills.filter).
	availableFilters: string[];
}>();

// `automatic` is true when nothing was chosen by the user: the stored settings were only
// completed with the filters' defaults and the graph recomputed.
const emit = defineEmits<{ 'update:profile': [profile: MetadataProfileTrack, automatic: boolean] }>();

type FilterSettings = MetadataFilter['settings'];

const registry = computed(() => (props.type === 'video' ? Filters.Video : Filters.Audio) as unknown as FilterRegistry);

const filters = computed(() => registry.value.List().filter((f) => props.availableFilters.includes(f.filter)));

function stored(filter: string): Record<string, unknown> | undefined {
	return props.profile.filter?.settings?.[filter]?.settings;
}

function entry(filter: string, settings: Record<string, unknown>): FilterSettings[string] {
	// The pan filter's graph is an array in legacy; it is stored as the filter returns it.
	return { settings, graph: registry.value.Get(filter)!.createGraph(settings) as string };
}

function update(changed: FilterSettings, automatic: boolean) {
	const settings: FilterSettings = { ...props.profile.filter?.settings, ...changed };

	// The filter graph follows the order in which the filters are registered.
	const graphs = [];
	for (const name of registry.value.Filters()) {
		const graph = settings[name]?.graph;
		if (graph !== undefined && graph.length !== 0) {
			graphs.push(graph);
		}
	}

	emit('update:profile', { ...props.profile, filter: { ...props.profile.filter, graph: graphs.join(','), settings } }, automatic);
}

// Legacy's filter components report back once when they appear: the stored settings completed
// with the filter's defaults and a fresh graph. Do the same for all of them at once.
watch(
	() => `${props.type}/${filters.value.map((f) => f.filter).join(',')}`,
	() => {
		if (filters.value.length === 0) return;
		update(Object.fromEntries(filters.value.map((f) => [f.filter, entry(f.filter, f.init(stored(f.filter)))])), true);
	},
	{ immediate: true },
);
</script>

<template>
	<p v-if="filters.length === 0" class="text-sm text-muted">{{ $t('No suitable filter found.') }}</p>

	<div v-else class="space-y-4">
		<p class="text-sm text-muted">{{ $t('Select your filter settings (optional):') }}</p>

		<CoderSettingsForm
			v-for="filter in filters"
			:key="filter.filter"
			:fields="getFilterFields(type, filter.filter)"
			:model-value="filter.init(stored(filter.filter))"
			@update:model-value="(settings) => update({ [filter.filter]: entry(filter.filter, settings) }, false)"
		/>
	</div>
</template>
