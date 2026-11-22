import { describe, expect, test } from 'bun:test';

import { adminPassValid, decideDirect, encodeAdminPass } from './direct';

const channels = [
	{ channelid: 'aaaa-1', access: 'public' as const },
	{ channelid: 'bbbb-2', access: 'passcode' as const },
	{ channelid: 'cccc-3', access: 'hidden' as const },
];

describe('direct requests to the core', () => {
	test('stream files of public channels pass, in memory and on disk', () => {
		for (const uri of [
			'/memfs/aaaa-1.m3u8',
			'/memfs/aaaa-1_output_0_0001.ts?x=1',
			'/memfs/aaaa-1.jpg',
			'/aaaa-1.m3u8',
			'/aaaa-1/main/2026/1.ts',
			'/memfs/chunk-aaaa-1-00001.mp4',
		]) {
			expect(decideDirect(uri, channels, false)).toBe(true);
		}
	});

	test('stream files of passcode, hidden and unlisted channels do not', () => {
		for (const uri of [
			'/memfs/bbbb-2.m3u8',
			'/memfs/bbbb-2_output_0_0001.ts',
			'/memfs/cccc-3.jpg',
			'/bbbb-2/main/1.ts',
			'/memfs/dddd-4.m3u8',
			'/memfs/%62bbb-2.m3u8',
			'/memfs/x.m3u8',
		]) {
			expect(decideDirect(uri, channels, false)).toBe(false);
		}
	});

	test('a public id that is a prefix of another id, or tucked into a path, opens nothing else', () => {
		const tricky = [{ channelid: 'aaaa', access: 'public' as const }];
		expect(decideDirect('/memfs/aaaa-1.m3u8', tricky, false)).toBe(false);
		expect(decideDirect('/memfs/aaaa/../bbbb-2.m3u8', tricky, false)).toBe(false);
		expect(decideDirect('/memfs/%zz.m3u8', tricky, false)).toBe(false);
	});

	test('the admin gets every stream file', () => {
		expect(decideDirect('/memfs/bbbb-2.m3u8', channels, true)).toBe(true);
		expect(decideDirect('/memfs/dddd-4.jpg', channels, true)).toBe(true);
	});

	test('what is not a stream file is left to the core', () => {
		for (const uri of ['/', '/index.html', '/bbbb-2.html', '/api/v3/process', '/ui/', '/_player/video.js']) {
			expect(decideDirect(uri, channels, false)).toBe(true);
		}
	});
});

describe('admin pass', () => {
	const secret = 'a'.repeat(64);

	test('valid until it expires; not forgeable', () => {
		const token = encodeAdminPass(2000, secret);
		expect(adminPassValid(token, secret, 1999)).toBe(true);
		expect(adminPassValid(token, secret, 2000)).toBe(false);
		expect(adminPassValid(token, 'b'.repeat(64), 1999)).toBe(false);
		expect(adminPassValid(`9999.${token.split('.')[1]}`, secret, 1999)).toBe(false);
		for (const bad of [undefined, '', 'x', '1.2.3', 'abc.def']) expect(adminPassValid(bad, secret, 0)).toBe(false);
	});
});
