// Editing operations of the template editor. Each returns a new template; the input is not changed.
import { blockDefaults, type Block, type BlockType, type Preset, type Template } from './template';

export type Region = keyof Template;
export const regions: Region[] = ['main', 'side'];

// The page needs these; they can be moved but not removed, and exist once.
export const requiredBlocks: BlockType[] = ['player', 'channels'];

const newId = () => Math.random().toString(36).slice(2, 10);

const clone = (template: Template): Template => ({ main: [...template.main], side: [...template.side] });

export function findBlock(template: Template, id: string): { region: Region; index: number; block: Block } | null {
	for (const region of regions) {
		const index = template[region].findIndex((b) => b.id === id);
		if (index !== -1) return { region, index, block: template[region][index]! };
	}
	return null;
}

export const hasBlock = (template: Template, type: BlockType) => regions.some((r) => template[r].some((b) => b.type === type));

/** Whether a block of this type may be added (the required ones exist once). */
export const canAdd = (template: Template, type: BlockType) => !(requiredBlocks.includes(type) && hasBlock(template, type));

export function addBlock(template: Template, type: BlockType, region: Region, index = template[region].length): Template {
	if (!canAdd(template, type)) return template;
	const next = clone(template);
	next[region].splice(Math.max(0, Math.min(index, next[region].length)), 0, { id: newId(), type, props: { ...blockDefaults[type] } });
	return next;
}

/**
 * Moves a block in front of the block currently at `index` of `region`
 * (`index` = length of the region: to its end).
 */
export function moveBlock(template: Template, id: string, region: Region, index: number): Template {
	const found = findBlock(template, id);
	if (!found) return template;

	const next = clone(template);
	next[found.region].splice(found.index, 1);
	// Taking the block out shifted everything behind it in its own region.
	const target = found.region === region && found.index < index ? index - 1 : index;
	next[region].splice(Math.max(0, Math.min(target, next[region].length)), 0, found.block);
	return next;
}

/** One step up or down within its region. */
export function nudgeBlock(template: Template, id: string, by: -1 | 1): Template {
	const found = findBlock(template, id);
	if (!found) return template;
	const to = found.index + by;
	if (to < 0 || to >= template[found.region].length) return template;
	return moveBlock(template, id, found.region, by === 1 ? to + 1 : to);
}

export function removeBlock(template: Template, id: string): Template {
	const found = findBlock(template, id);
	if (!found || requiredBlocks.includes(found.block.type)) return template;
	const next = clone(template);
	next[found.region].splice(found.index, 1);
	return next;
}

export function setBlockProp(template: Template, id: string, key: string, value: string | boolean): Template {
	const found = findBlock(template, id);
	if (!found || !(key in blockDefaults[found.block.type])) return template;
	const next = clone(template);
	next[found.region][found.index] = { ...found.block, props: { ...found.block.props, [key]: value } };
	return next;
}

/** A copy with fresh block ids, so a template applied from a preset shares nothing with it. */
export function copyTemplate(template: Template): Template {
	const copy = (blocks: Block[]) => blocks.map((b) => ({ id: newId(), type: b.type, props: { ...b.props } }));
	return { main: copy(template.main), side: copy(template.side) };
}

/** Saves the template under a name; an existing preset of that name is replaced. */
export function savePreset(presets: Preset[], name: string, template: Template): Preset[] {
	const trimmed = name.trim();
	if (trimmed === '') return presets;
	const preset = { id: presets.find((p) => p.name === trimmed)?.id ?? newId(), name: trimmed, template: copyTemplate(template) };
	return presets.some((p) => p.id === preset.id) ? presets.map((p) => (p.id === preset.id ? preset : p)) : [...presets, preset];
}
