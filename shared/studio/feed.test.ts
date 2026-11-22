import { describe, expect, test } from 'bun:test';

import { feedArgs, feedTarget, maskTarget, parseFeedProgress } from './feed';
import { QUALITIES } from './setup';

const rtmp = (values: Record<string, unknown> = {}) => ({ rtmp: { enable: true, address: ':1935', app: '/', token: '', ...values } });

describe('where the server publishes a feed', () => {
	test("the core's host and the RTMP server's port", () => {
		expect(feedTarget('http://core:8080', rtmp(), 'chan-1')).toBe('rtmp://core:1935/chan-1.stream');
		expect(feedTarget('https://live.example.com/', rtmp({ address: '0.0.0.0:1936' }), 'chan-1')).toBe('rtmp://live.example.com:1936/chan-1.stream');
	});

	test('the app is cleaned up like the client does', () => {
		expect(feedTarget('http://core:8080', rtmp({ app: 'live' }), 'c')).toBe('rtmp://core:1935/live/c.stream');
		expect(feedTarget('http://core:8080', rtmp({ app: '//live//in/' }), 'c')).toBe('rtmp://core:1935/live/in/c.stream');
		expect(feedTarget('http://core:8080', rtmp({ app: '' }), 'c')).toBe('rtmp://core:1935/c.stream');
	});

	test('the token travels encoded, and never into a message', () => {
		const target = feedTarget('http://core:8080', rtmp({ token: 'se cret/&?' }), 'c')!;
		expect(target).toBe('rtmp://core:1935/c.stream?token=se%20cret%2F%26%3F');
		expect(maskTarget(`Failed to open ${target}`)).toBe('Failed to open rtmp://core:1935/c.stream?token=***');
	});

	test('no target while the RTMP server is off, or without a usable core address', () => {
		expect(feedTarget('http://core:8080', rtmp({ enable: false }), 'c')).toBeNull();
		expect(feedTarget('http://core:8080', null, 'c')).toBeNull();
		expect(feedTarget('', rtmp(), 'c')).toBeNull();
	});
});

describe('ffmpeg arguments for a feed', () => {
	const args = feedArgs(QUALITIES['720p'], 'rtmp://core:1935/c.stream');
	const value = (flag: string) => args[args.indexOf(flag) + 1];

	test('reads the recording from stdin and publishes FLV to the target', () => {
		expect(value('-i')).toBe('pipe:0');
		expect(args.slice(-3)).toEqual(['-f', 'flv', 'rtmp://core:1935/c.stream']);
	});

	test('H.264 at a steady frame rate with a keyframe exactly every two seconds, AAC stereo', () => {
		expect(value('-c:v')).toBe('libx264');
		expect(value('-vf')).toContain('fps=30');
		expect(value('-vf')).toContain('scale=1280:720');
		expect(value('-g')).toBe('60');
		expect(value('-keyint_min')).toBe('60');
		expect(value('-sc_threshold')).toBe('0');
		expect(value('-b:v')).toBe('3500k');
		expect(value('-c:a')).toBe('aac');
		expect(value('-ar')).toBe('48000');
		expect(value('-ac')).toBe('2');
	});

	test('the quality sets size and bitrate', () => {
		const full = feedArgs(QUALITIES['1080p'], 'rtmp://x/y');
		expect(full[full.indexOf('-vf') + 1]).toContain('scale=1920:1080');
		expect(full[full.indexOf('-b:v') + 1]).toBe('6000k');
	});
});

describe("reading ffmpeg's progress", () => {
	const block = (frame: number, last = 'continue') =>
		`frame=${frame}\nfps=29.97\nstream_0_0_q=23.0\nbitrate=3498.2kbits/s\ntotal_size=1234\nout_time_us=4500000\ndup_frames=2\ndrop_frames=1\nspeed=1.01x\nprogress=${last}\n`;

	test('the values of a block', () => {
		expect(parseFeedProgress(block(135))).toEqual({ frames: 135, fps: 29.97, bitrateKbit: 3498.2, speed: 1.01, dropped: 1, duplicated: 2, seconds: 4.5 });
	});

	test('of several blocks the last complete one counts', () => {
		expect(parseFeedProgress(block(30) + block(60) + 'frame=90\nfps=30\n')!.frames).toBe(60);
		expect(parseFeedProgress(block(30) + block(60, 'end'))!.frames).toBe(60);
	});

	test('values ffmpeg does not know yet read as zero', () => {
		expect(parseFeedProgress('frame=0\nfps=0.00\nbitrate=N/A\nspeed=N/A\nprogress=continue\n')).toMatchObject({ bitrateKbit: 0, speed: 0 });
	});

	test('no complete block, no progress', () => {
		expect(parseFeedProgress('')).toBeNull();
		expect(parseFeedProgress('frame=12\nfps=30\n')).toBeNull();
	});
});
