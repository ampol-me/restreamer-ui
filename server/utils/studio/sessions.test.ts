import { afterEach, describe, expect, test } from 'bun:test';
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { QUALITIES } from '../../../shared/studio/setup';
import { FeedError, FeedSessions } from './sessions';

// Stands in for ffmpeg: writes what it gets on stdin to a file, reports progress like ffmpeg does.
function fakeFfmpeg(body: string): { path: string; out: string } {
	const dir = mkdtempSync(join(tmpdir(), 'studio-feed-'));
	const out = join(dir, 'received');
	const path = join(dir, 'ffmpeg');
	writeFileSync(path, `#!/bin/sh\n${body.replaceAll('$OUT', out)}\n`);
	chmodSync(path, 0o755);
	return { path, out };
}

const recorder = () => fakeFfmpeg('printf "frame=42\\nfps=30\\nbitrate=3500.0kbits/s\\nspeed=1x\\nprogress=continue\\n"\ncat > $OUT');
const bytes = (text: string) => new TextEncoder().encode(text);
const until = async (condition: () => boolean) => {
	for (let i = 0; i < 100 && !condition(); i++) await new Promise((resolve) => setTimeout(resolve, 20));
};
const reason = (run: () => unknown) => {
	try {
		run();
	} catch (e: unknown) {
		return e instanceof FeedError ? e.reason : 'other';
	}
	return 'none';
};

let sessions: FeedSessions | null = null;
afterEach(() => sessions?.close());

describe('Studio feeds', () => {
	test('pieces reach ffmpeg in order; a repeated piece is taken once', async () => {
		const ffmpeg = recorder();
		sessions = new FeedSessions({ ffmpegPath: ffmpeg.path });
		const id = await sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p']);
		expect(id).toMatch(/^[0-9a-f]{64}$/);

		sessions.push(id, 0, bytes('one '));
		sessions.push(id, 1, bytes('two '));
		sessions.push(id, 1, bytes('two '));
		sessions.push(id, 2, bytes('three'));
		sessions.end(id);

		await until(() => {
			try {
				return readFileSync(ffmpeg.out, 'utf8') === 'one two three';
			} catch {
				return false;
			}
		});
		expect(readFileSync(ffmpeg.out, 'utf8')).toBe('one two three');
	});

	test('a missing piece is refused, the feed stays up for the right one', async () => {
		sessions = new FeedSessions({ ffmpegPath: recorder().path });
		const id = await sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p']);
		expect(reason(() => sessions!.push(id, 3, bytes('late')))).toBe('gap');
		expect(reason(() => sessions!.push(id, 0, bytes('first')))).toBe('none');
	});

	test("answers with ffmpeg's progress", async () => {
		sessions = new FeedSessions({ ffmpegPath: recorder().path });
		const id = await sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p']);
		await until(() => sessions!.push(id, 0, bytes('x')).frames === 42);
		expect(sessions.push(id, 0, bytes('x'))).toMatchObject({ frames: 42, fps: 30, bitrateKbit: 3500 });
	});

	test('one feed per channel; the channel is free again once it ended', async () => {
		sessions = new FeedSessions({ ffmpegPath: recorder().path });
		const id = await sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p']);
		expect(sessions.live()).toEqual(['chan-1']);
		expect(sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p'])).rejects.toMatchObject({ reason: 'busy' });
		await sessions.start('chan-2', 'rtmp://core/y', QUALITIES['720p']);

		expect(sessions.end(id)).toBe(true);
		expect(sessions.live()).toEqual(['chan-2']);
		expect(reason(() => sessions!.push(id, 0, bytes('x')))).toBe('ended');
		await sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p']);
	});

	test('an unknown feed is refused', () => {
		sessions = new FeedSessions({ ffmpegPath: recorder().path });
		expect(reason(() => sessions!.push('nope', 0, bytes('x')))).toBe('unknown');
		expect(sessions.end('nope')).toBe(false);
	});

	test('without ffmpeg on the server going live says so', () => {
		sessions = new FeedSessions({ ffmpegPath: '/nonexistent/ffmpeg' });
		expect(sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p'])).rejects.toMatchObject({ reason: 'no-ffmpeg' });
	});

	test('when ffmpeg gives up, the next piece is answered with its last words — without the token', async () => {
		const ffmpeg = fakeFfmpeg('echo "Failed to open rtmp://core/x?token=secret" >&2\nexit 1');
		sessions = new FeedSessions({ ffmpegPath: ffmpeg.path });
		const id = await sessions.start('chan-1', 'rtmp://core/x?token=secret', QUALITIES['720p']);
		await until(() => sessions!.live().length === 0);

		let message = '';
		try {
			sessions.push(id, 0, bytes('x'));
		} catch (e: unknown) {
			message = (e as Error).message;
		}
		expect(message).toContain('Failed to open rtmp://core/x?token=***');
		expect(message).not.toContain('secret');
	});

	test('a feed whose Studio went silent is taken off air', async () => {
		let now = 1000;
		sessions = new FeedSessions({ ffmpegPath: recorder().path, idleMs: 20_000, now: () => now });
		const id = await sessions.start('chan-1', 'rtmp://core/x', QUALITIES['720p']);
		now += 21_000;
		// The check runs on a timer; here it is called as the timer would.
		(sessions as unknown as { reap(): void }).reap();
		expect(sessions.live()).toEqual([]);
		expect(reason(() => sessions!.push(id, 0, bytes('x')))).toBe('ended');
	});
});
