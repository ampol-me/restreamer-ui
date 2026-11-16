// Parity: the logic extracted into shared/ must produce exactly what the legacy React
// modules produce. Runs every coder/filter from both trees over a matrix of inputs.
import { describe, expect, test } from 'bun:test';

import * as Encoders from './encoders';
import * as Decoders from './decoders';
import * as Filters from '../filters';

// @ts-expect-error untyped legacy module
import * as LegacyEncoders from '../../legacy/src/misc/coders/Encoders';
// @ts-expect-error untyped legacy module
import * as LegacyDecoders from '../../legacy/src/misc/coders/Decoders';
// @ts-expect-error untyped legacy module
import * as LegacyFilters from '../../legacy/src/misc/filters';

const skillsMatrix = [
	undefined,
	{},
	{ ffmpeg: { version: '4.4.1', version_major: 4, version_minor: 4 } },
	{ ffmpeg: { version: '5.1.2', version_major: 5, version_minor: 1 } },
	{ ffmpeg: { version: '6.1.1', version_major: 6, version_minor: 1 } },
	{ ffmpeg: { version: '7.1.0', version_major: 7, version_minor: 1 } },
];

const streamMatrix = [
	undefined,
	{},
	{ type: 'video', codec: 'h264', width: 1920, height: 1080, pix_fmt: 'yuv420p' },
	{ type: 'video', codec: 'hevc', width: 3840, height: 2160, pix_fmt: 'yuv420p10le' },
	{ type: 'video', codec: 'av1', width: 1280, height: 720, pix_fmt: 'yuv420p' },
	{ type: 'audio', codec: 'aac', sampling_hz: 48000, layout: 'stereo', channels: 2 },
	{ type: 'audio', codec: 'aac', sampling_hz: 44100, layout: 'stereo', channels: 2 },
	{ type: 'audio', codec: 'mp3', sampling_hz: 44100, layout: 'mono', channels: 1 },
	{ type: 'audio', codec: 'opus', sampling_hz: 48000, layout: '5.1', channels: 6 },
];

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const plain = (v: unknown) => JSON.parse(JSON.stringify(v ?? null));

const META = ['coder', 'name', 'codec', 'codecs', 'type', 'hwaccel', 'filter'];

function compareRegistries(label: string, ported: any, legacy: any, keysOf: (r: any) => string[], added: string[] = []) {
	describe(label, () => {
		test('registers the legacy modules first, in the same order', () => {
			expect(keysOf(legacy).length).toBeGreaterThan(0);
			expect(keysOf(ported).slice(0, keysOf(legacy).length)).toEqual(keysOf(legacy));
			expect(keysOf(ported).slice(keysOf(legacy).length)).toEqual(added);
		});

		for (const key of keysOf(legacy)) {
			test(key, () => {
				const a = ported.Get(key);
				const b = legacy.Get(key);
				expect(a).not.toBeNull();

				for (const m of META) {
					expect(a[m]).toEqual(b[m]);
				}

				let compared = 0;
				for (const skills of skillsMatrix) {
					for (const stream of streamMatrix) {
						const da = a.defaults(clone(stream), clone(skills));
						const db = b.defaults(clone(stream), clone(skills));
						expect(plain(da)).toEqual(plain(db));
						compared++;

						if (typeof b.summarize === 'function') {
							expect(a.summarize(clone(db.settings))).toEqual(b.summarize(clone(db.settings)));
						}

						if (typeof b.createGraph === 'function') {
							expect(a.createGraph(clone(db.settings))).toEqual(b.createGraph(clone(db.settings)));
							expect(a.createGraph({})).toEqual(b.createGraph({}));
						}
					}
				}
				expect(compared).toBe(skillsMatrix.length * streamMatrix.length);
			});
		}
	});
}

// The last argument lists coders that only exist in the new UI (tested in encoders/new.test.ts).
compareRegistries('video encoders', Encoders.Video, LegacyEncoders.Video, (r) => r.Coders(), ['hevc_nvenc', 'av1_nvenc', 'av1_vaapi', 'libsvtav1']);
compareRegistries('audio encoders', Encoders.Audio, LegacyEncoders.Audio, (r) => r.Coders());
compareRegistries('video decoders', Decoders.Video, LegacyDecoders.Video, (r) => r.Coders());
compareRegistries('audio decoders', Decoders.Audio, LegacyDecoders.Audio, (r) => r.Coders());
compareRegistries('video filters', Filters.Video, LegacyFilters.Video, (r) => r.Filters());
compareRegistries('audio filters', Filters.Audio, LegacyFilters.Audio, (r) => r.Filters());

describe('registry lookups', () => {
	const available = ['copy', 'none', 'libx264', 'libx265', 'h264_nvenc', 'hevc_vaapi', 'librav1e', 'aac', 'libopus', 'libmp3lame'];
	for (const codec of ['h264', 'hevc', 'av1', 'vp9', 'aac', 'opus', 'mp3', 'nope']) {
		test(`GetCoder(s)ForCodec ${codec}`, () => {
			for (const [p, l] of [
				[Encoders.Video, LegacyEncoders.Video],
				[Encoders.Audio, LegacyEncoders.Audio],
			] as const) {
				expect(p.GetCoderForCodec(codec, available)?.coder ?? null).toEqual(l.GetCoderForCodec(codec, available)?.coder ?? null);
				for (const hw of ['any', 'no', 'yes']) {
					expect(p.GetCodersForCodec(codec, available, hw).map((c: any) => c.coder)).toEqual(
						l.GetCodersForCodec(codec, available, hw).map((c: any) => c.coder),
					);
				}
			}
		});
	}
});
