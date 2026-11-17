<script setup lang="ts">
// A channel that plays uploaded video files in sequence ("VOD channel"). The files and the
// playlist file live with the channel on the core's disk; see shared/sources/playlist.ts.
import * as S from '#shared/sources/playlist';
import type { SourceInput, SourceSettings } from '#shared/sources/types';

const props = withDefaults(defineProps<{ settings?: SourceSettings }>(), { settings: () => ({}) });

const emit = defineEmits<{
	'update:settings': [settings: SourceSettings];
	probe: [settings: SourceSettings, inputs: SourceInput[]];
	refresh: [];
}>();

const { t } = useI18n();
const toast = useToast();
const { api } = useRestreamer();

const settings = computed(() => S.initSettings(props.settings));
const mismatched = computed(() => S.mismatches(settings.value.items));
const totalSize = computed(() => settings.value.items.reduce((sum, item) => sum + item.size, 0));

const input = ref<HTMLInputElement | null>(null);
// The upload in progress: which file of how many, and how far it is.
const uploading = ref<{ name: string; index: number; count: number; percent: number } | null>(null);
const busy = ref(false);

function megabytes(bytes: number): string {
	return bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(2)} GB` : `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

/** Writes the playlist file for `items` under a new name and hands the new settings up. */
async function commit(items: S.PlaylistItem[], loop = settings.value.loop) {
	const revision = settings.value.revision + 1;
	const address = items.length > 0 ? await api().UploadData('', S.listName(revision), new TextEncoder().encode(S.listFile(items)).buffer as ArrayBuffer) : '';
	emit('update:settings', { items, loop, address, revision });
}

async function change(items: S.PlaylistItem[]) {
	busy.value = true;
	try {
		await commit(items);
	} catch {
		toast.add({ title: t('The playlist could not be stored on the core.'), color: 'error' });
	} finally {
		busy.value = false;
	}
}

async function describe(path: string): Promise<{ video: string; audio: string }> {
	const [result] = await api().Probe(api().GetCurrentChannelID(), [{ address: '{diskfs}' + path, options: [] }]);
	return S.describeStreams(result?.streams ?? []);
}

async function picked(event: Event) {
	const target = event.target as HTMLInputElement;
	const files = [...(target.files ?? [])];
	// The same files can be picked again after a failed upload.
	target.value = '';
	if (files.length === 0) return;

	busy.value = true;
	let items = settings.value.items;
	try {
		for (const [index, file] of files.entries()) {
			const stored = S.storeName(file.name);
			if (!stored) {
				toast.add({ title: t('{name} is not a video file this playlist can play.', { name: file.name }), color: 'error' });
				continue;
			}

			uploading.value = { name: file.name, index: index + 1, count: files.length, percent: 0 };
			const path = await api().UploadFile('', stored.file, file, (sent, total) => {
				if (uploading.value) uploading.value = { ...uploading.value, percent: total > 0 ? Math.floor((sent / total) * 100) : 0 };
			});
			if (!path) throw new Error(t('The channel does not exist any more.'));

			uploading.value = { ...uploading.value, percent: 100 };
			items = [...items, { id: stored.id, title: file.name, file: stored.file, size: file.size, ...(await describe(path)) }];
			// After every file, so that a later failure keeps what is already there.
			await commit(items);
		}
	} catch (e: unknown) {
		toast.add({ title: t('Uploading the file failed'), description: e instanceof Error ? e.message : String(e), color: 'error' });
	} finally {
		uploading.value = null;
		busy.value = false;
	}
}

// The stored file of a removed entry stays until the playlist is opened again (see below):
// the running channel may still be reading it.
const remove = (id: string) => change(settings.value.items.filter((item) => item.id !== id));
const move = (from: number, to: number) => change(S.moveItem(settings.value.items, from, to));

async function setLoop(loop: boolean) {
	emit('update:settings', { ...settings.value, loop });
}

// --- drag and drop (the arrow buttons do the same for keyboard and touch) --------------------
const dragIndex = ref<number | null>(null);
const dropIndex = ref<number | null>(null);

function dragStart(event: DragEvent, index: number) {
	dragIndex.value = index;
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', String(index));
	}
}

function dragOver(event: DragEvent, index: number) {
	if (dragIndex.value === null) return;
	event.preventDefault();
	dropIndex.value = index;
}

function drop(event: DragEvent) {
	event.preventDefault();
	const from = dragIndex.value;
	const to = dropIndex.value;
	dragIndex.value = dropIndex.value = null;
	if (from !== null && to !== null && !busy.value) void move(from, to);
}

function probe() {
	emit('probe', settings.value, S.createInputs(settings.value));
}

// What is stored but no longer used by the settings this form was opened with (the saved ones):
// files of removed entries, superseded playlist files, uploads that were never saved.
onMounted(async () => {
	try {
		for (const name of S.orphans(await api().ListData(''), settings.value)) {
			await api().DeleteData('', name);
		}
	} catch {
		// Leftover files cost disk space only; the next visit tries again.
	}
});
</script>

<template>
	<div class="space-y-4">
		<p class="text-sm text-muted">
			{{ $t('Upload video files and put them in order. The channel plays them one after the other, like a live signal.') }}
		</p>

		<UAlert
			color="neutral"
			variant="subtle"
			icon="i-lucide-info"
			:title="$t('Files are played as uploaded.')"
			:description="
				$t(
					'All files of a playlist need the same video codec, picture size, frame rate and audio format. Files that differ from the first one are marked.',
				)
			"
		/>

		<ul v-if="settings.items.length > 0" class="space-y-2" :aria-label="$t('Playlist')" @drop="drop">
			<li
				v-for="(item, index) in settings.items"
				:key="item.id"
				class="flex min-h-11 items-center gap-2 rounded-md border bg-elevated py-1 pr-1 pl-2"
				:class="[dropIndex === index && dragIndex !== index ? 'border-primary' : 'border-default', dragIndex === index ? 'opacity-40' : '']"
				:draggable="!busy"
				@dragstart="dragStart($event, index)"
				@dragover="dragOver($event, index)"
				@dragend="dragIndex = dropIndex = null"
			>
				<UIcon name="i-lucide-grip-vertical" class="size-4 shrink-0 cursor-grab text-muted" />
				<span class="w-6 shrink-0 text-right font-mono text-sm text-muted">{{ index + 1 }}</span>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-semibold text-highlighted">{{ item.title }}</p>
					<p class="truncate font-mono text-xs text-muted">
						{{ [item.video, item.audio, megabytes(item.size)].filter(Boolean).join(' · ') }}
					</p>
				</div>
				<TallyBadge v-if="mismatched.has(item.id)" state="error" :label="item.video ? $t('Differs') : $t('Unreadable')" />
				<UButton
					size="sm"
					color="neutral"
					variant="ghost"
					icon="i-lucide-arrow-up"
					:disabled="busy || index === 0"
					:aria-label="$t('Move {name} up', { name: item.title })"
					@click="move(index, index - 1)"
				/>
				<UButton
					size="sm"
					color="neutral"
					variant="ghost"
					icon="i-lucide-arrow-down"
					:disabled="busy || index === settings.items.length - 1"
					:aria-label="$t('Move {name} down', { name: item.title })"
					@click="move(index, index + 1)"
				/>
				<UButton
					size="sm"
					color="neutral"
					variant="ghost"
					icon="i-lucide-trash-2"
					:disabled="busy"
					:aria-label="$t('Remove {name} from the playlist', { name: item.title })"
					@click="remove(item.id)"
				/>
			</li>
		</ul>
		<p v-else class="rounded-md border border-dashed border-accented py-6 text-center text-sm text-muted">{{ $t('The playlist is empty.') }}</p>

		<div v-if="uploading" class="space-y-1" role="status">
			<p class="truncate text-sm">
				{{ $t('Uploading {name} ({index} of {count})', { name: uploading.name, index: uploading.index, count: uploading.count }) }}
				<span class="font-mono text-muted">{{ uploading.percent }}%</span>
			</p>
			<UProgress :model-value="uploading.percent" />
		</div>

		<UAlert
			v-if="mismatched.size > 0"
			color="warning"
			variant="subtle"
			icon="i-lucide-triangle-alert"
			:title="$t('Some files differ from the first one.')"
			:description="
				$t('The stream is likely to break where such a file starts. Convert the marked files to the format of the first one, or remove them.')
			"
		/>

		<div class="flex flex-wrap items-center gap-4">
			<input ref="input" type="file" multiple :accept="S.accept" class="hidden" @change="picked" />
			<UButton color="neutral" variant="outline" icon="i-lucide-upload" :loading="busy" :label="$t('Upload videos')" @click="input?.click()" />
			<USwitch :model-value="settings.loop" :disabled="busy" :label="$t('Start again after the last file')" @update:model-value="setLoop" />
			<span v-if="settings.items.length > 0" class="font-mono text-sm text-muted">{{ megabytes(totalSize) }}</span>
		</div>

		<UButton :label="$t('Probe')" :disabled="busy || settings.items.length === 0" @click="probe" />
	</div>
</template>
