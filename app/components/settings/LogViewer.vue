<script setup lang="ts">
import type { CoreClient } from '#shared/core/types';
import type { SettingsClient } from '#shared/core/types.settings';

// The system log of the core, refreshed every second while it is on screen.
const props = defineProps<{ paused?: boolean }>();

const { t } = useI18n();
const toast = useToast();
const { api } = useRestreamer();
const client = () => api() as unknown as CoreClient & SettingsClient;

const text = ref('');
const expanded = ref(false);
const inline = useTemplateRef<HTMLPreElement>('inline');
const large = useTemplateRef<HTMLPreElement>('large');

// Follow the end of the log, unless the reader scrolled up to look at something.
const NEAR_BOTTOM = 24;
const atBottom = (el: HTMLElement) => el.scrollHeight - el.scrollTop - el.clientHeight <= NEAR_BOTTOM;
const toBottom = (el: HTMLElement | null) => {
	if (el) el.scrollTop = el.scrollHeight;
};

usePolling(async () => {
	if (props.paused) return;

	const lines = await client().Log();
	const next = lines.map((line) => (typeof line === 'string' ? line : JSON.stringify(line))).join('\n');
	if (next === text.value) return;

	const follow = [inline.value, large.value].map((el) => (el ? atBottom(el) : true));
	text.value = next;
	await nextTick();
	if (follow[0]) toBottom(inline.value);
	if (follow[1]) toBottom(large.value);
}, 1000);

watch(expanded, async (isOpen) => {
	if (!isOpen) return;
	await nextTick();
	toBottom(large.value);
});

async function copy() {
	try {
		await navigator.clipboard.writeText(text.value);
		toast.add({ title: t('Data copied to clipboard'), color: 'success' });
	} catch {
		toast.add({ title: t('Error while copying data to clipboard'), color: 'error' });
	}
}

function download() {
	const url = URL.createObjectURL(new Blob([text.value], { type: 'text/plain' }));
	const a = document.createElement('a');
	a.href = url;
	a.download = 'core.log';
	a.click();
	URL.revokeObjectURL(url);
}
</script>

<template>
	<div class="overflow-hidden rounded-md border border-default bg-elevated">
		<div class="flex items-center justify-end gap-1 border-b border-default px-2 py-1">
			<UTooltip :text="$t('Copy')">
				<UButton icon="i-lucide-copy" color="neutral" variant="ghost" size="sm" :aria-label="$t('Copy')" :disabled="text.length === 0" @click="copy" />
			</UTooltip>
			<UTooltip :text="$t('Download')">
				<UButton
					icon="i-lucide-download"
					color="neutral"
					variant="ghost"
					size="sm"
					:aria-label="$t('Download')"
					:disabled="text.length === 0"
					@click="download"
				/>
			</UTooltip>
			<UTooltip :text="$t('Maximize')">
				<UButton icon="i-lucide-maximize-2" color="neutral" variant="ghost" size="sm" :aria-label="$t('Maximize')" @click="expanded = true" />
			</UTooltip>
		</div>
		<pre ref="inline" class="h-96 overflow-auto p-3 font-mono text-xs whitespace-pre-wrap" tabindex="0">{{ text }}</pre>

		<UModal v-model:open="expanded" fullscreen :title="$t('System')">
			<template #body>
				<pre ref="large" class="h-full overflow-auto rounded-md bg-elevated p-3 font-mono text-xs whitespace-pre-wrap" tabindex="0">{{ text }}</pre>
			</template>
			<template #footer>
				<UButton icon="i-lucide-copy" color="neutral" variant="subtle" :label="$t('Copy')" :disabled="text.length === 0" @click="copy" />
				<UButton icon="i-lucide-download" color="neutral" variant="subtle" :label="$t('Download')" :disabled="text.length === 0" @click="download" />
			</template>
		</UModal>
	</div>
</template>
