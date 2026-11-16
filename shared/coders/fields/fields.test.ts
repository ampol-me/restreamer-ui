// Every registered coder has a settings form (possibly empty) that fits its settings, and
// the `init`/`createMapping` exports the forms rely on agree with `defaults()`.
import { describe, expect, test } from 'bun:test';

import * as Decoders from '../decoders';
import * as Encoders from '../encoders';
import { checkFields, contexts } from './check';
import { getDecoderFields, getEncoderFields, hasDecoderFields, hasEncoderFields } from './index';

const registries = [
	['video encoder', 'video', Encoders.Video, hasEncoderFields, getEncoderFields],
	['audio encoder', 'audio', Encoders.Audio, hasEncoderFields, getEncoderFields],
	['video decoder', 'video', Decoders.Video, hasDecoderFields, getDecoderFields],
	['audio decoder', 'audio', Decoders.Audio, hasDecoderFields, getDecoderFields],
] as const;

for (const [label, type, registry, has, get] of registries) {
	describe(`${label} fields`, () => {
		for (const coder of (registry as any).List()) {
			test(coder.coder, () => {
				expect(has(type, coder.coder)).toBe(true);
				checkFields(get(type, coder.coder), coder.defaults().settings);
			});

			test(`${coder.coder}: init/createMapping agree with defaults()`, () => {
				expect(typeof coder.createMapping).toBe('function');
				// copy, none and rawvideo have no settings and therefore no init().
				const settings = typeof coder.init === 'function' ? coder.init({}) : {};
				expect(settings).toEqual(coder.defaults().settings);
				if (get(type, coder.coder).length !== 0) {
					expect(typeof coder.init).toBe('function');
				}

				for (const ctx of contexts) {
					const { stream, skills } = ctx as { stream: any; skills: any };
					expect(coder.createMapping(settings, stream ?? undefined, skills)).toEqual(coder.defaults(stream ?? undefined, skills).mapping);
				}
			});
		}

		test('unknown coders have no fields', () => {
			expect(has(type, 'nope')).toBe(false);
			expect(get(type, 'nope')).toEqual([]);
			expect(get(type, 'constructor')).toEqual([]);
		});
	});
}

describe('fps_mode', () => {
	const field = getEncoderFields('video', 'libx264').find((f) => f.key === 'fps_mode')!;

	test('is only offered from FFmpeg 5 on (and when the version is unknown, like the coders assume)', () => {
		expect(field.showIf!({}, { stream: null, skills: { ffmpeg: { version_major: 4 } } })).toBe(false);
		expect(field.showIf!({}, { stream: null, skills: { ffmpeg: { version_major: 5 } } })).toBe(true);
		expect(field.showIf!({}, { stream: null, skills: undefined })).toBe(true);
	});
});
