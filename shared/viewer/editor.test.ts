import { describe, expect, test } from 'bun:test';

import { addBlock, canAdd, copyTemplate, moveBlock, nudgeBlock, removeBlock, savePreset, setBlockProp } from './editor';
import type { Block, BlockType, Template } from './template';

const b = (id: string, type: BlockType = 'text'): Block => ({ id, type, props: {} });
const template = (): Template => ({ main: [b('h', 'header'), b('p', 'player'), b('t')], side: [b('c', 'channels'), b('f', 'footer')] });
const ids = (t: Template) => [t.main.map((x) => x.id).join(''), t.side.map((x) => x.id).join('')];

describe('moving blocks', () => {
	test('within a region, in front of the block at the index', () => {
		expect(ids(moveBlock(template(), 't', 'main', 0))).toEqual(['thp', 'cf']);
		expect(ids(moveBlock(template(), 'h', 'main', 3))).toEqual(['pth', 'cf']);
		expect(ids(moveBlock(template(), 'h', 'main', 2))).toEqual(['pht', 'cf']);
		// dropping a block onto its own place changes nothing
		expect(ids(moveBlock(template(), 'p', 'main', 1))).toEqual(['hpt', 'cf']);
		expect(ids(moveBlock(template(), 'p', 'main', 2))).toEqual(['hpt', 'cf']);
	});

	test('between regions', () => {
		expect(ids(moveBlock(template(), 't', 'side', 1))).toEqual(['hp', 'ctf']);
		expect(ids(moveBlock(template(), 'c', 'main', 99))).toEqual(['hptc', 'f']);
	});

	test('does not change its input; unknown ids are ignored', () => {
		const before = template();
		moveBlock(before, 't', 'side', 0);
		expect(ids(before)).toEqual(['hpt', 'cf']);
		expect(moveBlock(before, 'zz', 'side', 0)).toBe(before);
	});

	test('nudging one step stops at the ends', () => {
		expect(ids(nudgeBlock(template(), 'p', 1))).toEqual(['htp', 'cf']);
		expect(ids(nudgeBlock(template(), 'p', -1))).toEqual(['pht', 'cf']);
		expect(ids(nudgeBlock(template(), 'h', -1))).toEqual(['hpt', 'cf']);
		expect(ids(nudgeBlock(template(), 'f', 1))).toEqual(['hpt', 'cf']);
	});
});

describe('adding and removing', () => {
	test('player and channel list exist once and cannot be removed', () => {
		expect(canAdd(template(), 'player')).toBe(false);
		expect(addBlock(template(), 'channels', 'side').side).toHaveLength(2);
		expect(ids(removeBlock(template(), 'p'))).toEqual(['hpt', 'cf']);
		expect(ids(removeBlock(template(), 't'))).toEqual(['hp', 'cf']);
	});

	test('a new block gets its defaults and a fresh id at the given place', () => {
		const next = addBlock(template(), 'button', 'side', 0);
		expect(next.side[0]).toMatchObject({ type: 'button', props: { label: '', url: '' } });
		expect(['h', 'p', 't', 'c', 'f']).not.toContain(next.side[0]!.id);
	});

	test('only settings the block type knows can be set', () => {
		const next = setBlockProp(template(), 'p', 'showTitle', false);
		expect(next.main[1]!.props).toEqual({ showTitle: false });
		expect(setBlockProp(template(), 'p', 'onclick', 'x').main[1]!.props).toEqual({});
	});
});

describe('presets', () => {
	test('saving copies the template; the same name replaces', () => {
		const current = template();
		const presets = savePreset([], ' Event ', current);
		expect(presets).toHaveLength(1);
		expect(presets[0]!.name).toBe('Event');
		expect(presets[0]!.template.main[0]!.id).not.toBe('h');

		const again = savePreset(presets, 'Event', removeBlock(current, 't'));
		expect(again).toHaveLength(1);
		expect(again[0]!.id).toBe(presets[0]!.id);
		expect(again[0]!.template.main).toHaveLength(2);

		expect(savePreset(again, '  ', current)).toBe(again);
		expect(savePreset(again, 'Other', current)).toHaveLength(2);
	});

	test('applying a preset shares no block with it', () => {
		const source = template();
		const copy = copyTemplate(source);
		expect(copy.main.map((x) => x.type)).toEqual(source.main.map((x) => x.type));
		expect(copy.main.some((x, i) => x.id === source.main[i]!.id)).toBe(false);
	});
});
