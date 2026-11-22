// Encoders added for the Nuxt UI (HEVC/AV1). No legacy counterpart, so the expected
// FFmpeg arguments are spelled out here.
import { describe, expect, test } from 'bun:test';

import * as Encoders from './index';

const get = (coder: string) => (Encoders.Video as any).Get(coder);

describe('new video encoders', () => {
	test('hevc_nvenc', () => {
		const c = get('hevc_nvenc');
		expect([c.codec, c.type, c.hwaccel]).toEqual(['hevc', 'video', true]);
		expect(c.defaults().mapping).toEqual({
			global: [],
			local: [
				'-codec:v',
				'hevc_nvenc',
				'-preset:v',
				'medium',
				'-b:v',
				'4096k',
				'-maxrate',
				'4096k',
				'-bufsize',
				'4096k',
				'-r',
				'25',
				'-pix_fmt',
				'yuv420p',
				'-g',
				'50',
			],
			filter: [],
		});
		expect(c.createMapping(c.init({ gop: 'auto', profile: 'main10', rc: 'cbr', fps: '30', bitrate: '8000' })).local).toEqual([
			'-codec:v',
			'hevc_nvenc',
			'-preset:v',
			'medium',
			'-b:v',
			'8000k',
			'-maxrate',
			'8000k',
			'-bufsize',
			'8000k',
			'-r',
			'30',
			'-pix_fmt',
			'yuv420p',
			'-profile:v',
			'main10',
			'-rc:v',
			'cbr',
		]);
	});

	test('av1_nvenc', () => {
		const c = get('av1_nvenc');
		expect([c.codec, c.type, c.hwaccel]).toEqual(['av1', 'video', true]);
		expect(c.defaults().mapping.local.slice(0, 2)).toEqual(['-codec:v', 'av1_nvenc']);
		expect(c.defaults().mapping.local.slice(-2)).toEqual(['-g', '50']);
	});

	test('av1_vaapi uploads frames to the VAAPI device', () => {
		const c = get('av1_vaapi');
		expect([c.codec, c.type, c.hwaccel]).toEqual(['av1', 'video', true]);
		expect(c.defaults().mapping).toEqual({
			global: [['-vaapi_device', '/dev/dri/renderD128']],
			local: ['-codec:v', 'av1_vaapi', '-b:v', '4096k', '-maxrate', '4096k', '-bufsize', '4096k', '-r', '25', '-g', '50'],
			filter: ['format=nv12', 'hwupload'],
		});
		expect(c.createMapping(c.init({ rc_mode: 'CBR', gop: 'auto' })).local.slice(-2)).toEqual(['-rc_mode', 'CBR']);
	});

	test('libsvtav1', () => {
		const c = get('libsvtav1');
		expect([c.codec, c.type, c.hwaccel]).toEqual(['av1', 'video', false]);
		expect(c.defaults().mapping.local).toEqual([
			'-codec:v',
			'libsvtav1',
			'-preset:v',
			'10',
			'-b:v',
			'4096k',
			'-maxrate:v',
			'4096k',
			'-bufsize:v',
			'4096k',
			'-r',
			'25',
			'-pix_fmt',
			'yuv420p',
			'-g',
			'50',
			'-fps_mode',
			'auto',
		]);
		// -fps_mode does not exist before FFmpeg 5
		expect(c.defaults({}, { ffmpeg: { version_major: 4 } }).mapping.local).not.toContain('-fps_mode');
		expect(c.createMapping(c.init({ params: 'tune=0' })).local).toContain('-svtav1-params');
	});

	test('legacy coders stay the first choice per codec; new ones are picked when they are all the core has', () => {
		const V = Encoders.Video as any;
		expect(V.GetCoderForCodec('hevc', ['libx265', 'hevc_nvenc']).coder).toBe('libx265');
		expect(V.GetCoderForCodec('hevc', ['hevc_nvenc']).coder).toBe('hevc_nvenc');
		expect(V.GetCoderForCodec('av1', ['libsvtav1', 'av1_nvenc']).coder).toBe('av1_nvenc');
		expect(V.GetCodersForCodec('av1', ['librav1e', 'libsvtav1', 'av1_vaapi'], 'no').map((c: any) => c.coder)).toEqual(['librav1e', 'libsvtav1']);
	});
});
