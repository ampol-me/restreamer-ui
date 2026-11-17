<script setup lang="ts">
// Arranges the blocks of the viewer page by drag and drop. Every drag has a button
// equivalent (move up / down / to the other column) for keyboard and touch.
import {
	addBlock,
	canAdd,
	copyTemplate,
	findBlock,
	moveBlock,
	nudgeBlock,
	regions,
	removeBlock,
	requiredBlocks,
	savePreset,
	setBlockProp,
	type Region,
} from '#shared/viewer/editor';
import { blockDefaults, blockTypes, type Block, type BlockType, type Preset, type Template } from '#shared/viewer/template';

const template = defineModel<Template>('template', { required: true });
const presets = defineModel<Preset[]>('presets', { required: true });
defineProps<{ builtinPresets: Preset[] }>();

const { t } = useI18n();
const toast = useToast();

const blockInfo = computed<Record<BlockType, { label: string; icon: string }>>(() => ({
	header: { label: t('Page header'), icon: 'i-lucide-panel-top' },
	player: { label: t('Player'), icon: 'i-lucide-play' },
	channels: { label: t('Channel list'), icon: 'i-lucide-list' },
	text: { label: t('Text'), icon: 'i-lucide-type' },
	image: { label: t('Image'), icon: 'i-lucide-image' },
	button: { label: t('Button'), icon: 'i-lucide-link' },
	footer: { label: t('Footer'), icon: 'i-lucide-panel-bottom' },
}));

const propLabels = computed<Record<string, string>>(() => ({
	showLogo: t('Show the logo'),
	subtitle: t('Subtitle'),
	showTitle: t('Show the channel name'),
	showDescription: t('Show the channel description'),
	showShare: t('Show the share button'),
	heading: t('Heading'),
	body: t('Text'),
	url: t('Address (https://…)'),
	alt: t('Description of the image'),
	link: t('Link when clicked (https://…)'),
	label: t('Label'),
	imprint: t('Imprint'),
	terms: t('Terms'),
}));

const regionLabels = computed<Record<Region, string>>(() => ({ main: t('Main column'), side: t('Side column') }));
const longText = new Set(['body', 'imprint', 'terms']);

const openId = ref<string | null>(null);

// --- drag and drop -------------------------------------------------------------------------
// What is being dragged: an existing block (id) or a new one from the palette (type).
const dragging = ref<{ id: string } | { type: BlockType } | null>(null);
const dropAt = ref<{ region: Region; index: number } | null>(null);

function dragStart(event: DragEvent, payload: { id: string } | { type: BlockType }) {
	dragging.value = payload;
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = 'move';
		// Firefox only starts a drag that carries data.
		event.dataTransfer.setData('text/plain', 'id' in payload ? payload.id : payload.type);
	}
}

function dragEnd() {
	dragging.value = null;
	dropAt.value = null;
}

// Over a block: drop before or after it, whichever half the pointer is in.
function overBlock(event: DragEvent, region: Region, index: number) {
	if (!dragging.value) return;
	event.preventDefault();
	const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
	dropAt.value = { region, index: event.clientY < box.top + box.height / 2 ? index : index + 1 };
}

// Over the empty part of a column: drop at its end.
function overRegion(event: DragEvent, region: Region) {
	if (!dragging.value) return;
	event.preventDefault();
	if (event.target === event.currentTarget) dropAt.value = { region, index: template.value[region].length };
}

function drop(event: DragEvent) {
	event.preventDefault();
	const payload = dragging.value;
	const at = dropAt.value;
	dragEnd();
	if (!payload || !at) return;
	template.value = 'id' in payload ? moveBlock(template.value, payload.id, at.region, at.index) : addBlock(template.value, payload.type, at.region, at.index);
}

// --- button equivalents --------------------------------------------------------------------
const other = (region: Region): Region => (region === 'main' ? 'side' : 'main');

function add(type: BlockType) {
	template.value = addBlock(template.value, type, 'main');
}

function toOtherColumn(block: Block) {
	const found = findBlock(template.value, block.id);
	if (found) template.value = moveBlock(template.value, block.id, other(found.region), template.value[other(found.region)].length);
}

// --- presets -------------------------------------------------------------------------------
const presetName = ref('');
const pendingPreset = ref<Preset | null>(null);
const deletingPreset = ref<Preset | null>(null);

function applyPreset() {
	if (!pendingPreset.value) return;
	template.value = copyTemplate(pendingPreset.value.template);
	openId.value = null;
	pendingPreset.value = null;
}

function saveAsPreset() {
	const name = presetName.value.trim();
	if (name === '') return;
	const replaced = presets.value.some((p) => p.name === name);
	presets.value = savePreset(presets.value, name, template.value);
	presetName.value = '';
	toast.add({
		title: replaced ? t('Preset "{name}" updated', { name }) : t('Preset "{name}" added', { name }),
		description: t('Save the page to keep it.'),
		color: 'success',
	});
}

function deletePreset() {
	presets.value = presets.value.filter((p) => p.id !== deletingPreset.value?.id);
	deletingPreset.value = null;
}
</script>

<template>
	<div class="space-y-6">
		<section class="space-y-2">
			<h3 class="ph-label text-muted">{{ $t('Presets') }}</h3>
			<div class="flex flex-wrap gap-2">
				<UButton
					v-for="preset in builtinPresets"
					:key="preset.id"
					size="sm"
					color="neutral"
					variant="outline"
					icon="i-lucide-layout-template"
					:label="$t(preset.name)"
					@click="pendingPreset = preset"
				/>
				<UFieldGroup v-for="preset in presets" :key="preset.id" size="sm">
					<UButton color="neutral" variant="outline" icon="i-lucide-bookmark" :label="preset.name" @click="pendingPreset = preset" />
					<UButton
						color="neutral"
						variant="outline"
						icon="i-lucide-x"
						:aria-label="$t('Delete preset {name}', { name: preset.name })"
						@click="deletingPreset = preset"
					/>
				</UFieldGroup>
			</div>
			<form class="flex max-w-md items-end gap-2" @submit.prevent="saveAsPreset">
				<UFormField :label="$t('Save this layout as a preset')" class="flex-1">
					<UInput v-model="presetName" class="w-full" maxlength="60" :placeholder="$t('Preset name')" />
				</UFormField>
				<UButton
					type="submit"
					color="neutral"
					variant="outline"
					icon="i-lucide-bookmark-plus"
					:disabled="presetName.trim() === ''"
					:label="$t('Save preset')"
				/>
			</form>
		</section>

		<section class="space-y-2">
			<h3 class="ph-label text-muted">{{ $t('Blocks') }}</h3>
			<p class="text-sm text-muted">{{ $t('Drag a block into a column, or select it to add it to the main column.') }}</p>
			<div class="flex flex-wrap gap-2">
				<UButton
					v-for="type in blockTypes"
					:key="type"
					size="sm"
					color="neutral"
					variant="outline"
					:icon="blockInfo[type].icon"
					:label="blockInfo[type].label"
					:disabled="!canAdd(template, type)"
					:draggable="canAdd(template, type)"
					class="cursor-grab"
					@dragstart="dragStart($event, { type })"
					@dragend="dragEnd"
					@click="add(type)"
				/>
			</div>
		</section>

		<div class="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
			<section v-for="region in regions" :key="region" class="space-y-2">
				<h3 class="ph-label text-muted">{{ regionLabels[region] }}</h3>
				<ul
					class="min-h-24 space-y-2 rounded-lg border border-dashed p-2"
					:class="dropAt?.region === region ? 'border-primary' : 'border-accented'"
					:aria-label="regionLabels[region]"
					@dragover="overRegion($event, region)"
					@drop="drop"
				>
					<li v-if="template[region].length === 0" class="pointer-events-none py-6 text-center text-sm text-muted">{{ $t('Drop blocks here') }}</li>

					<li
						v-for="(block, index) in template[region]"
						:key="block.id"
						class="relative rounded-md border border-default bg-elevated"
						:class="dragging && 'id' in dragging && dragging.id === block.id ? 'opacity-40' : ''"
						draggable="true"
						@dragstart="dragStart($event, { id: block.id })"
						@dragend="dragEnd"
						@dragover.stop="overBlock($event, region, index)"
					>
						<div v-if="dropAt?.region === region && dropAt.index === index" class="absolute inset-x-0 -top-[5px] h-0.5 rounded-full bg-primary" />
						<div
							v-if="dropAt?.region === region && dropAt.index === index + 1 && index === template[region].length - 1"
							class="absolute inset-x-0 -bottom-[5px] h-0.5 rounded-full bg-primary"
						/>

						<div class="flex min-h-11 items-center gap-1 pr-1 pl-2">
							<UIcon name="i-lucide-grip-vertical" class="size-4 shrink-0 cursor-grab text-muted" />
							<UIcon :name="blockInfo[block.type].icon" class="size-4 shrink-0 text-muted" />
							<span class="min-w-0 flex-1 truncate px-1 text-sm font-semibold text-highlighted">{{ blockInfo[block.type].label }}</span>

							<UButton
								size="sm"
								color="neutral"
								variant="ghost"
								icon="i-lucide-arrow-up"
								:disabled="index === 0"
								:aria-label="$t('Move {block} up', { block: blockInfo[block.type].label })"
								@click="template = nudgeBlock(template, block.id, -1)"
							/>
							<UButton
								size="sm"
								color="neutral"
								variant="ghost"
								icon="i-lucide-arrow-down"
								:disabled="index === template[region].length - 1"
								:aria-label="$t('Move {block} down', { block: blockInfo[block.type].label })"
								@click="template = nudgeBlock(template, block.id, 1)"
							/>
							<UButton
								size="sm"
								color="neutral"
								variant="ghost"
								icon="i-lucide-arrow-left-right"
								:aria-label="$t('Move {block} to the other column', { block: blockInfo[block.type].label })"
								@click="toOtherColumn(block)"
							/>
							<UButton
								size="sm"
								color="neutral"
								variant="ghost"
								icon="i-lucide-settings-2"
								:aria-expanded="openId === block.id"
								:aria-label="$t('Settings of {block}', { block: blockInfo[block.type].label })"
								@click="openId = openId === block.id ? null : block.id"
							/>
							<UButton
								size="sm"
								color="neutral"
								variant="ghost"
								icon="i-lucide-trash-2"
								:disabled="requiredBlocks.includes(block.type)"
								:aria-label="$t('Remove {block}', { block: blockInfo[block.type].label })"
								@click="template = removeBlock(template, block.id)"
							/>
						</div>

						<div v-if="openId === block.id" class="space-y-3 border-t border-default p-3">
							<template v-for="(fallback, key) in blockDefaults[block.type]" :key="key">
								<USwitch
									v-if="typeof fallback === 'boolean'"
									:model-value="block.props[key] === true"
									:label="propLabels[key]"
									@update:model-value="(value) => (template = setBlockProp(template, block.id, String(key), value))"
								/>
								<UFormField v-else :label="propLabels[key]">
									<UTextarea
										v-if="longText.has(String(key))"
										:model-value="String(block.props[key] ?? '')"
										class="w-full"
										:rows="4"
										@update:model-value="(value) => (template = setBlockProp(template, block.id, String(key), String(value)))"
									/>
									<UInput
										v-else
										:model-value="String(block.props[key] ?? '')"
										class="w-full"
										@update:model-value="(value) => (template = setBlockProp(template, block.id, String(key), String(value)))"
									/>
								</UFormField>
							</template>
						</div>
					</li>
				</ul>
			</section>
		</div>

		<UModal :open="pendingPreset !== null" :title="$t('Apply this preset?')" @update:open="(open) => !open && (pendingPreset = null)">
			<template #body>
				<p>{{ $t('The current layout and the settings of its blocks are replaced by "{name}".', { name: pendingPreset?.name ?? '' }) }}</p>
			</template>
			<template #footer>
				<UButton color="neutral" variant="outline" :label="$t('Cancel')" @click="pendingPreset = null" />
				<UButton :label="$t('Apply preset')" @click="applyPreset" />
			</template>
		</UModal>

		<UModal :open="deletingPreset !== null" :title="$t('Delete this preset?')" @update:open="(open) => !open && (deletingPreset = null)">
			<template #body>
				<p>{{ $t('"{name}" is removed from the presets. The current layout does not change.', { name: deletingPreset?.name ?? '' }) }}</p>
			</template>
			<template #footer>
				<UButton color="neutral" variant="outline" :label="$t('Cancel')" @click="deletingPreset = null" />
				<UButton color="error" :label="$t('Delete preset')" @click="deletePreset" />
			</template>
		</UModal>
	</div>
</template>
