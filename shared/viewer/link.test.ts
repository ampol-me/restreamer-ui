import { expect, test } from 'bun:test';

import { resolveChannel, shortId } from './link';

const channels = [
	{ channelid: 'a4ff4073-a7e1-4f57-aab6-8b2d49e8bbce' },
	{ channelid: 'a4ff4073-ffff-4f57-aab6-000000000000' },
	{ channelid: '0238ce05-271c-4d6e-9d0c-111111111111' },
];

test('a channel is found by its full id or by a unique beginning of eight characters or more', () => {
	expect(shortId(channels[2]!.channelid)).toBe('0238ce05');
	expect(resolveChannel(channels, '0238ce05')).toBe(channels[2]!);
	expect(resolveChannel(channels, '0238ce05-271c')).toBe(channels[2]!);
	expect(resolveChannel(channels, channels[0]!.channelid)).toBe(channels[0]!);
});

test('ambiguous, too short, unknown and malformed references find nothing', () => {
	expect(resolveChannel(channels, 'a4ff4073')).toBeNull();
	expect(resolveChannel(channels, 'a4ff4073-a')).toBe(channels[0]!);
	for (const bad of ['0238ce0', '', 'ffffffff', '0238ce05/..', '0238ce05%', undefined, null, 12345678, ['0238ce05']]) {
		expect(resolveChannel(channels, bad)).toBeNull();
	}
});
