import { expect, test } from 'bun:test';

import services from '../services';
import { grouped, matchesQuery, popular, popularServices } from './picker';

const all = services.List();

test('every popular service is a registered one', () => {
	expect(popular(all).map((s) => s.id)).toEqual(popularServices);
});

test('search matches name or id, ignoring case and surrounding spaces', () => {
	expect(matchesQuery({ id: 'youtube', name: 'YouTube Live' }, ' tube ')).toBe(true);
	expect(matchesQuery({ id: 'rtmp', name: 'RTMP' }, 'rtm')).toBe(true);
	expect(matchesQuery({ id: 'rtmp', name: 'RTMP' }, 'srt')).toBe(false);
	expect(matchesQuery({ id: 'rtmp', name: 'RTMP' }, '')).toBe(true);
});

test('groups keep the category order, sort by name and drop empty groups', () => {
	const everything = grouped(all, '');
	expect(everything.map((g) => g.category)).toEqual(['platform', 'software', 'universal']);
	expect(everything.reduce((n, g) => n + g.services.length, 0)).toBe(all.length);
	const names = everything[0]!.services.map((s) => s.name);
	expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));

	expect(grouped(all, 'twitch').map((g) => [g.category, g.services.map((s) => s.id)])).toEqual([['platform', ['twitch']]]);
	expect(grouped(all, 'no such service')).toEqual([]);
});
