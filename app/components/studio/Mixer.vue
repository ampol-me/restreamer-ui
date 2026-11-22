<script setup lang="ts">
import type { StudioEngine } from '~/composables/useStudioEngine';

// The sound of the programme: every source that has sound, its level, volume and mute.
const props = defineProps<{ engine: StudioEngine }>();

const audible = computed(() => props.engine.sources.value.filter((s) => s.audio));

// Sound of a screen or a video file is only in the mix while the source is on stage.
const offStage = (id: string, kind: string) => kind !== 'mic' && !props.engine.stage.value.includes(id);
</script>

<template>
	<div class="space-y-5">
		<div class="space-y-2">
			<div class="flex items-center justify-between text-sm">
				<span class="font-medium text-highlighted">{{ $t('Programme') }}</span>
				<span class="text-muted">{{ $t('What the viewers hear') }}</span>
			</div>
			<StudioMeter :level="engine.programLevel.value" :label="$t('Programme level')" />
		</div>

		<USeparator />

		<p v-if="audible.length === 0" class="text-sm text-muted">{{ $t('No sound source yet. Add a microphone to be heard.') }}</p>

		<ul v-else class="space-y-5">
			<li v-for="source in audible" :key="source.id" class="space-y-2">
				<div class="flex items-center gap-2">
					<UIcon
						:name="source.kind === 'mic' ? 'i-lucide-mic' : source.kind === 'screen' ? 'i-lucide-monitor' : 'i-lucide-film'"
						class="size-4 shrink-0 text-muted"
					/>
					<span class="min-w-0 flex-1 truncate text-sm text-highlighted" :title="source.label">{{ source.label }}</span>
					<span v-if="offStage(source.id, source.kind)" class="text-xs text-muted">{{ $t('Off stage') }}</span>
					<UButton
						size="sm"
						:color="source.muted ? 'error' : 'neutral'"
						:variant="source.muted ? 'subtle' : 'ghost'"
						:icon="source.muted ? 'i-lucide-mic-off' : 'i-lucide-volume-2'"
						:aria-label="source.muted ? $t('Unmute {name}', { name: source.label }) : $t('Mute {name}', { name: source.label })"
						:aria-pressed="source.muted"
						@click="engine.setMuted(source.id, !source.muted)"
					/>
				</div>
				<StudioMeter :level="engine.levels[source.id] ?? 0" :label="$t('Level of {name}', { name: source.label })" />
				<USlider
					:min="0"
					:max="150"
					:model-value="Math.round(source.volume * 100)"
					:aria-label="$t('Volume of {name}', { name: source.label })"
					@update:model-value="(value) => engine.setVolume(source.id, Number(value) / 100)"
				/>
			</li>
		</ul>
	</div>
</template>
