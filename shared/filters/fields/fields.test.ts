// Every registered filter has a settings form that fits its settings, and the `init` /
// `createGraph` exports the forms rely on agree with `defaults()`.
import { describe, expect, test } from 'bun:test';

import * as Filters from '../index';
import { checkFields } from '../../coders/fields/check';
import { getFilterFields, hasFilterFields } from './index';

for (const [type, registry] of [
	['video', Filters.Video],
	['audio', Filters.Audio],
] as const) {
	describe(`${type} filter fields`, () => {
		for (const filter of (registry as any).List()) {
			test(filter.filter, () => {
				expect(hasFilterFields(type, filter.filter)).toBe(true);
				const fields = getFilterFields(type, filter.filter);
				expect(fields.length).toBeGreaterThan(0);
				checkFields(fields, filter.defaults().settings);
			});

			test(`${filter.filter}: init/createGraph agree with defaults()`, () => {
				expect(filter.init({})).toEqual(filter.defaults().settings);
				expect(filter.createGraph(filter.init({}))).toEqual(filter.defaults().graph);
			});
		}

		test('unknown filters have no fields', () => {
			expect(hasFilterFields(type, 'nope')).toBe(false);
			expect(getFilterFields(type, 'nope')).toEqual([]);
		});
	});
}

describe('derived settings', () => {
	test('resample keeps the channel count in step with the layout', () => {
		const layout = getFilterFields('audio', 'aresample').find((f) => f.key === 'layout')!;
		expect(layout.derive!('mono', {})).toEqual({ channels: 1 });
		expect(layout.derive!('stereo', {})).toEqual({ channels: 2 });
		expect(layout.derive!('inherit', {})).toEqual({ channels: 2 });
	});

	test('the volume dB field is only editable for the custom level', () => {
		const db = getFilterFields('audio', 'volume').find((f) => f.key === 'db')!;
		expect(db.disabledIf!({ level: 'inherit' }, { stream: null, skills: {} })).toBe(true);
		expect(db.disabledIf!({ level: 'custom' }, { stream: null, skills: {} })).toBe(false);
	});
});
