import { describe, expect, test } from 'bun:test';

import { AttemptLimiter } from './limiter';
import { hashPasscode, isValidPasscode, verifyPasscode } from './passcode';
import { isAllowedStreamPath, isChannelId, upstreamStreamPath } from './paths';

describe('passcode', () => {
	test('is exactly six digits', () => {
		expect(isValidPasscode('012345')).toBe(true);
		for (const bad of ['12345', '1234567', '12345a', ' 123456', '１２３４５６', '', 123456, null, undefined]) {
			expect(isValidPasscode(bad)).toBe(false);
		}
	});

	test('verifies against the stored hash only', () => {
		const stored = hashPasscode('482913');
		expect(stored.hash).not.toContain('482913');
		expect(verifyPasscode('482913', stored)).toBe(true);
		expect(verifyPasscode('482914', stored)).toBe(false);
		expect(verifyPasscode('', stored)).toBe(false);
		expect(verifyPasscode('482913', null)).toBe(false);
		expect(verifyPasscode('482913', { salt: stored.salt, hash: '00' })).toBe(false);
	});

	test('the same passcode hashes differently per salt', () => {
		expect(hashPasscode('111111').hash).not.toBe(hashPasscode('111111').hash);
	});
});

describe('attempt limiter', () => {
	const options = { windowMs: 1000, maxPerClient: 3, maxGlobal: 5 };

	test('blocks a client after its failures and recovers when the window passes', () => {
		const limiter = new AttemptLimiter(options);
		for (const t of [0, 100, 200]) {
			expect(limiter.retryAfter('a', t)).toBe(0);
			limiter.recordFailure('a', t);
		}
		expect(limiter.retryAfter('a', 300)).toBe(700);
		expect(limiter.retryAfter('b', 300)).toBe(0);
		expect(limiter.retryAfter('a', 1001)).toBe(0);
	});

	test('a success clears the client', () => {
		const limiter = new AttemptLimiter(options);
		limiter.recordFailure('a', 0);
		limiter.recordFailure('a', 1);
		limiter.recordSuccess('a');
		limiter.recordFailure('a', 2);
		expect(limiter.retryAfter('a', 3)).toBe(0);
	});

	test('the global budget also stops clients that never failed themselves', () => {
		const limiter = new AttemptLimiter(options);
		for (let i = 0; i < 5; i++) {
			limiter.recordFailure(`client-${i}`, i * 10);
		}
		expect(limiter.retryAfter('fresh', 100)).toBe(900);
		expect(limiter.retryAfter('fresh', 1001)).toBe(0);
	});
});

describe('stream paths', () => {
	const id = 'deaf802e-7faf-4d4c-bc56-83a3ffc9b13b';

	test('files the ingest writes for the channel are allowed', () => {
		for (const path of [
			`${id}.m3u8`,
			`${id}_output_0.m3u8`,
			`${id}_output_0_0042.ts`,
			`${id}_output_0_0042.mp4`,
			`${id}.mp4`,
			`${id}.jpg`,
			`${id}/output_0/20261116/1763280000.ts`,
			`init-${id}.m4s`,
			`chunk-${id}-00001.m4s`,
		]) {
			expect(isAllowedStreamPath(id, path)).toBe(true);
		}
	});

	test('everything else is refused', () => {
		for (const path of [
			'',
			'other-channel.m3u8',
			`${id}x.m3u8`,
			`${id}0.m3u8`,
			`../${id}.m3u8`,
			`${id}/../../core/config/config.json`,
			`${id}/..%2f..%2fetc/passwd`,
			`${id}/.hidden.ts`,
			`${id}.html`,
			`${id}.json`,
			`${id}`,
			`/${id}.m3u8`,
			`${id}//x.ts`,
			`${id}.m3u8?x=1`,
			`http://evil.example/${id}.m3u8`,
			`chunk-${id}0-1.m4s`,
		]) {
			expect(isAllowedStreamPath(id, path)).toBe(false);
		}
	});

	test('a channel id that is a prefix of another does not unlock it', () => {
		expect(isAllowedStreamPath('abc', 'abcdef.m3u8')).toBe(false);
		expect(isAllowedStreamPath('abc', 'abc-def.m3u8')).toBe(false);
	});

	test('channel ids', () => {
		expect(isChannelId(id)).toBe(true);
		for (const bad of ['', '../x', 'a/b', 'a b', '-abc', 'a'.repeat(65), 5]) {
			expect(isChannelId(bad)).toBe(false);
		}
	});

	test('upstream location by storage', () => {
		expect(upstreamStreamPath('memfs', `${id}.m3u8`)).toBe(`/memfs/${id}.m3u8`);
		expect(upstreamStreamPath('diskfs', `${id}.m3u8`)).toBe(`/${id}.m3u8`);
	});
});

describe('core session tracking', () => {
	test('the session parameter of a playlist request travels to the core, and nothing else', () => {
		expect(upstreamStreamPath('memfs', 'a_output_0.m3u8', 'fq2pBw2qE3EEDhbcs5ZGbR')).toBe('/memfs/a_output_0.m3u8?session=fq2pBw2qE3EEDhbcs5ZGbR');
		expect(upstreamStreamPath('diskfs', 'a.m3u8', 'abc')).toBe('/a.m3u8?session=abc');
		for (const bad of [undefined, '', 'a&token=x', 'a b', ['a', 'b'], '../x', 'x'.repeat(129)]) {
			expect(upstreamStreamPath('memfs', 'a.m3u8', bad)).toBe('/memfs/a.m3u8');
		}
	});
});
