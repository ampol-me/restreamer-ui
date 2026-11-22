import { describe, expect, test } from 'bun:test';

import Services from '../services';
import type { ServiceLink } from '../services/types';
import { markLinks, splitMarked } from './richText';

const links: [ServiceLink, ServiceLink] = [
	{ text: 'here', href: 'https://example.com/a' },
	{ text: 'there', href: 'https://example.com/b' },
];

describe('markLinks', () => {
	test('wraps the link texts in order of appearance', () => {
		expect(markLinks('Look here and there.', links)).toBe('Look <0>here</0> and <1>there</1>.');
		expect(markLinks('No links.', [])).toBe('No links.');
		expect(markLinks('No links.')).toBe('No links.');
	});

	test('leaves a link whose text is missing unmarked', () => {
		expect(markLinks('Only over there.', [{ text: 'this', href: 'https://example.com/c' }, links[1]])).toBe('Only over <1>there</1>.');
	});

	test('searches each link after the previous one', () => {
		const twice = [
			{ text: 'here', href: 'https://example.com/a' },
			{ text: 'here', href: 'https://example.com/b' },
		];
		expect(markLinks('here or here', twice)).toBe('<0>here</0> or <1>here</1>');
	});
});

describe('splitMarked', () => {
	test('splits into plain and linked segments', () => {
		expect(splitMarked('Look <0>here</0> and <1>there</1>.', links)).toEqual([
			{ text: 'Look ' },
			{ text: 'here', href: 'https://example.com/a' },
			{ text: ' and ' },
			{ text: 'there', href: 'https://example.com/b' },
			{ text: '.' },
		]);
	});

	test('follows the marker numbers, not their position (translations may reorder)', () => {
		expect(splitMarked('<1>dort</1> und <0>hier</0>', links)).toEqual([
			{ text: 'dort', href: 'https://example.com/b' },
			{ text: ' und ' },
			{ text: 'hier', href: 'https://example.com/a' },
		]);
	});

	test('keeps a marker without a link as plain text', () => {
		expect(splitMarked('a <3>b</3> c', links)).toEqual([{ text: 'a ' }, { text: 'b' }, { text: ' c' }]);
		expect(splitMarked('plain')).toEqual([{ text: 'plain' }]);
		expect(splitMarked('')).toEqual([]);
	});
});

describe('service descriptions', () => {
	test('every description link is found in its description', () => {
		for (const service of Services.List()) {
			const linked = splitMarked(markLinks(service.description, service.description_links), service.description_links).filter((s) => s.href);
			expect([service.id, linked.map((s) => s.href)]).toEqual([service.id, (service.description_links ?? []).map((l) => l.href)]);
		}
	});
});
