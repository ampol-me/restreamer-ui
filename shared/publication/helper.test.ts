// @ts-nocheck -- feeds both trees deliberately loose inputs (undefined, partial objects).
// Parity: shared/publication/helper.ts must produce exactly what legacy/src/views/Publication/helper.js
// produces. Runs every export of both modules over a matrix of inputs.
import { describe, expect, test } from 'bun:test';

import * as helper from './helper';
import * as M from '../metadata';
import Services from '../services';

import * as legacy from '../../legacy/src/views/Publication/helper';
import * as LegacyM from '../../legacy/src/utils/metadata';

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
const plain = (v: unknown) => JSON.parse(JSON.stringify(v ?? null));

// Skills as the core client hands them out (see _initSkills() in shared/core/restreamer.ts).
const makeSkills = (major: number, o: Record<string, any> = {}) => ({
	ffmpeg: { version: `${major}.1.0`, version_major: major, version_minor: 1 },
	codecs: {
		audio: { none: ['none'], aac: ['aac'], mp3: ['libmp3lame'], opus: ['libopus', 'opus'], vorbis: ['libvorbis'] },
		video: { none: ['none'], h264: ['libx264', 'h264_vaapi'], hevc: ['libx265'], vp9: ['libvpx-vp9'], av1: ['librav1e'] },
	},
	encoders: {
		audio: ['copy', 'none', 'aac', 'libmp3lame', 'libopus', 'opus', 'libvorbis'],
		video: ['copy', 'none', 'libx264', 'h264_vaapi', 'libx265', 'libvpx-vp9', 'librav1e'],
	},
	decoders: { audio: ['default'], video: ['default'] },
	formats: { demuxers: ['hls', 'flv'], muxers: ['hls', 'flv', 'mpegts', 'dash', 'rtsp', 'adts', 'webm', 'image2', 'fbdev', 'mp3', 'ogg', 'opus'] },
	protocols: { input: ['http', 'rtmp'], output: ['http', 'https', 'rtmp', 'rtmps', 'rtmpt', 'srt', 'udp', 'rtp', 'icecast', 'file'] },
	filter: ['scale', 'aresample'],
	sources: { network: [] },
	sinks: { fbdev: [{ id: '/dev/fb0', name: 'fb0' }] },
	...o,
});

const skillsMatrix = [
	undefined,
	null,
	makeSkills(4),
	makeSkills(6),
	makeSkills(7, { sinks: {} }),
	// A core that can only pass streams through.
	makeSkills(5, {
		codecs: { audio: { none: ['none'] }, video: { none: ['none'] } },
		encoders: { audio: ['copy', 'none'], video: ['copy', 'none'] },
		formats: { demuxers: [], muxers: [] },
		protocols: { input: [], output: [] },
		sinks: {},
	}),
	makeSkills(6, {
		codecs: { audio: { aac: ['aac'] }, video: { h264: ['libx264'] } },
		encoders: { audio: ['copy', 'none', 'aac'], video: ['copy', 'none', 'libx264'] },
		formats: { demuxers: ['hls'], muxers: ['flv'] },
		protocols: { input: ['http'], output: ['rtmp'] },
	}),
];

const requiresMatrix = [
	undefined,
	null,
	{},
	{ protocols: ['rtmp'] },
	{ protocols: ['nope'] },
	{ formats: ['flv', 'hls'] },
	{ formats: ['nope'] },
	{ devices: ['fbdev'] },
	{ devices: ['alsa'] },
	{ codecs: {} },
	{ codecs: { audio: ['aac'] } },
	{ codecs: { video: ['h264', 'nope'] } },
	{ codecs: { audio: ['nope'], video: ['h264'] } },
	{ codecs: { audio: ['aac'], video: ['nope'] } },
	{ protocols: ['rtmp', 'rtmps'], formats: ['flv'], devices: [], codecs: { audio: ['aac', 'mp3'], video: ['h264', 'hevc', 'av1'] } },
	...Services.List().map((s) => s.requires),
];

const video = (codec: string, o = {}) => ({ url: '', index: 0, stream: 0, type: 'video', codec, width: 1920, height: 1080, pix_fmt: 'yuv420p', ...o });
const audio = (codec: string, o = {}) => ({ url: '', index: 0, stream: 1, type: 'audio', codec, sampling_hz: 44100, layout: 'stereo', channels: 2, ...o });

const streamsMatrix = [
	[],
	[video('h264'), audio('aac')],
	[audio('aac', { stream: 0 }), video('h264', { stream: 1 })],
	[video('hevc'), audio('opus')],
	[video('mjpeg'), audio('pcm_s16le')],
	[video('h264')],
	[audio('mp3', { stream: 0 })],
	[video('vp9'), audio('aac'), audio('mp3', { stream: 2 })],
];

const codecsMatrix = {
	video: [['copy'], ['copy', 'h264'], ['copy', 'h264', 'hevc', 'av1'], ['copy', 'vp9'], ['copy', 'none', 'vp9'], ['copy', 'nope'], []],
	audio: [['copy'], ['copy', 'aac'], ['copy', 'aac', 'mp3'], ['copy', 'opus', 'vorbis'], ['copy', 'nope'], []],
};

const track = (stream: number, coder: string, o: Record<string, any> = {}) => ({
	source: 0,
	stream,
	encoder: { coder, settings: {}, mapping: { global: [], local: [], filter: [] } },
	decoder: { coder: 'default', settings: {}, mapping: { global: [], local: [], filter: [] } },
	filter: { graph: '', settings: {} },
	...o,
});

const profileMatrix = [
	track(-1, 'none'),
	track(0, 'copy'),
	track(1, 'copy'),
	track(0, 'libx264'),
	track(0, 'libx265'),
	track(0, 'libvpx-vp9'),
	track(1, 'aac'),
	track(1, 'libmp3lame'),
	track(0, 'aac'),
	track(0, 'nope'),
	track(1, 'none'),
	track(5, 'copy'),
	track(2, 'copy', { source: 3 }),
];

const preselectSkills = skillsMatrix.filter((s) => s);

// What a call did: its (JSON) result, or the kind of error it threw.
const outcome = (fn: () => unknown) => {
	try {
		return { threw: false, value: plain(fn()) };
	} catch (e) {
		return { threw: true, value: e.constructor.name };
	}
};

describe('exports', () => {
	test('the same names as legacy', () => {
		expect(Object.keys(helper).sort()).toEqual(Object.keys(legacy).sort());
	});
});

describe('createSourcesFromStreams', () => {
	test('matches legacy and keeps the streams by reference', () => {
		for (const streams of [undefined, ...streamsMatrix]) {
			expect(plain(helper.createSourcesFromStreams(clone(streams)))).toEqual(plain(legacy.createSourcesFromStreams(clone(streams))));
		}

		const streams = streamsMatrix[1];
		expect(helper.createSourcesFromStreams(streams)[0].streams).toBe(streams);
	});
});

describe('validateRequirements', () => {
	test('matches legacy', () => {
		for (const requires of requiresMatrix) {
			expect(helper.validateRequirements(clone(requires))).toEqual(legacy.validateRequirements(clone(requires)));
		}
	});

	test('does not modify the given object', () => {
		const requires = { protocols: ['rtmp'], codecs: { audio: ['aac'] } };
		helper.validateRequirements(requires);
		expect(requires).toEqual({ protocols: ['rtmp'], codecs: { audio: ['aac'] } });
	});
});

describe('checkServiceRequirements', () => {
	test('matches legacy', () => {
		const seen = new Set<boolean>();
		for (const skills of skillsMatrix) {
			for (const requires of requiresMatrix) {
				const expected = legacy.checkServiceRequirements(clone(requires), clone(skills));
				expect(helper.checkServiceRequirements(clone(requires), clone(skills))).toBe(expected);
				seen.add(expected);
			}
		}
		// The matrix must exercise both outcomes.
		expect([...seen].sort()).toEqual([false, true]);
	});
});

describe('conflateServiceSkills', () => {
	test('matches legacy', () => {
		for (const skills of skillsMatrix) {
			for (const requires of requiresMatrix) {
				expect(helper.conflateServiceSkills(clone(requires), clone(skills))).toEqual(legacy.conflateServiceSkills(clone(requires), clone(skills)));
			}
		}
	});

	test('copies the device lists instead of sharing them with the skills', () => {
		const skills = makeSkills(6);
		const serviceSkills = helper.conflateServiceSkills({ devices: ['fbdev'] }, skills);
		expect(serviceSkills.devices.fbdev).toEqual(skills.sinks.fbdev);
		expect(serviceSkills.devices.fbdev).not.toBe(skills.sinks.fbdev);
	});
});

describe('preselectProfile', () => {
	for (const type of ['video', 'audio'] as const) {
		test(`${type} matches legacy`, () => {
			let compared = 0;
			const coders = new Set<string>();
			for (const skills of preselectSkills) {
				for (const streams of streamsMatrix) {
					for (const codecs of codecsMatrix[type]) {
						for (const profile of profileMatrix) {
							const a = helper.preselectProfile(clone(profile), type, clone(streams), clone(codecs), clone(skills));
							const b = legacy.preselectProfile(clone(profile), type, clone(streams), clone(codecs), clone(skills));
							expect(plain(a)).toEqual(plain(b));
							coders.add(b.encoder.coder);
							compared++;
						}
					}
				}
			}
			expect(compared).toBe(preselectSkills.length * streamsMatrix.length * codecsMatrix[type].length * profileMatrix.length);
			// The matrix must reach the passthrough, the "no stream" and the encoding branch.
			expect(coders.has('copy')).toBe(true);
			expect(coders.has('none')).toBe(true);
			expect([...coders].some((c) => c !== 'copy' && c !== 'none')).toBe(true);
		});
	}

	test('returns the given profile object (it is modified in place)', () => {
		const plausible = track(0, 'copy');
		expect(helper.preselectProfile(plausible, 'video', streamsMatrix[1], ['copy', 'h264'], makeSkills(6))).toBe(plausible);

		const implausible = track(-1, 'none');
		expect(helper.preselectProfile(implausible, 'video', streamsMatrix[1], ['copy', 'h264'], makeSkills(6))).toBe(implausible);
		expect(implausible.stream).toBe(0);
		expect(implausible.encoder.coder).toBe('copy');
	});

	// shared/coders/encoders knows coders the legacy registry doesn't (hevc_nvenc, av1_nvenc, av1_vaapi,
	// libsvtav1). With one of them as the only encoder for the target codec legacy gives up ('none').
	test('picks an encoder that only exists in the new UI', () => {
		const skills = makeSkills(6, { encoders: { audio: ['copy', 'none'], video: ['copy', 'none', 'hevc_nvenc'] } });
		const streams = [video('h264')];

		const a = helper.preselectProfile(track(-1, 'none'), 'video', clone(streams), ['copy', 'hevc'], skills);
		expect(a.stream).toBe(0);
		expect(a.encoder.coder).toBe('hevc_nvenc');

		const b = legacy.preselectProfile(track(-1, 'none'), 'video', clone(streams), ['copy', 'hevc'], skills);
		expect(b.encoder.coder).toBe('none');
	});
});

describe('createInputsOutputs', () => {
	const outputsMatrix = [
		[],
		[{ address: 'rtmp://example.com/live/key', options: ['-f', 'flv'] }],
		[
			{ address: 'rtmps://a.example.com/live/key', options: ['-f', 'flv', '-rtmp_enhanced_codecs', 'hvc1'] },
			{ address: 'https://b.example.com/x.m3u8', options: ['-f', 'hls', '-hls_time', 2] },
		],
	];

	// Profiles as the pages build them: the egress defaults run through preselectProfile().
	const buildProfiles = (h: typeof helper, m: typeof M, streams, vcodecs, acodecs, skills) => {
		const profiles = m.initEgressMetadata({}).profiles;
		profiles[0].video = h.preselectProfile(profiles[0].video, 'video', streams, vcodecs, skills);
		profiles[0].audio = h.preselectProfile(profiles[0].audio, 'audio', streams, acodecs, skills);
		return profiles;
	};

	test('matches legacy', () => {
		let compared = 0;
		let complete = 0;
		let threw = 0;
		for (const skills of [makeSkills(4), makeSkills(6)]) {
			for (const streams of streamsMatrix) {
				for (const vcodecs of [['copy', 'h264'], ['copy', 'hevc', 'av1'], ['copy']]) {
					for (const acodecs of [['copy', 'aac'], ['copy', 'mp3'], ['copy']]) {
						for (const outputs of outputsMatrix) {
							for (const requireVideo of [undefined, true, false]) {
								const a = outcome(() =>
									helper.createInputsOutputs(
										helper.createSourcesFromStreams(clone(streams)),
										buildProfiles(helper, M, clone(streams), vcodecs, acodecs, skills),
										clone(outputs),
										requireVideo,
									),
								);
								const b = outcome(() =>
									legacy.createInputsOutputs(
										legacy.createSourcesFromStreams(clone(streams)),
										buildProfiles(legacy, LegacyM, clone(streams), vcodecs, acodecs, skills),
										clone(outputs),
										requireVideo,
									),
								);
								expect(a).toEqual(b);
								compared++;
								if (b.threw) threw++;
								else if (b.value[1].length !== 0 && b.value[2].length !== 0) complete++;
							}
						}
					}
				}
			}
		}
		expect(compared).toBe(2 * streamsMatrix.length * 3 * 3 * outputsMatrix.length * 3);
		// The matrix must reach the complete, the incomplete and the throwing branch.
		expect(complete).toBeGreaterThan(0);
		expect(threw).toBeGreaterThan(0);
		expect(complete + threw).toBeLessThan(compared);
	});

	// Inherited from legacy: without a video stream and requireVideo = false the profile counts as complete,
	// and M.createInputsOutputs() then dereferences the missing video stream. The pages have to catch this.
	test('throws for a source without a video stream if no video is required', () => {
		const streams = [audio('aac', { stream: 0 })];
		for (const [h, m] of [
			[helper, M],
			[legacy, LegacyM],
		] as const) {
			const profiles = buildProfiles(h, m, clone(streams), ['copy', 'h264'], ['copy', 'aac'], makeSkills(6));
			expect(() => h.createInputsOutputs(h.createSourcesFromStreams(clone(streams)), profiles, clone(outputsMatrix[1]), false)).toThrow(TypeError);
			expect(h.createInputsOutputs(h.createSourcesFromStreams(clone(streams)), profiles, clone(outputsMatrix[1]), true)).toEqual([[], [], []]);
		}
	});

	test('prepends the encoding options to every service output without touching the service outputs', () => {
		const streams = [video('h264'), audio('aac')];
		const outputs = clone(outputsMatrix[2]);
		const [, inputs, out] = helper.createInputsOutputs(
			helper.createSourcesFromStreams(streams),
			buildProfiles(helper, M, streams, ['copy', 'h264'], ['copy', 'aac'], makeSkills(6)),
			outputs,
			false,
		);

		expect(inputs.length).toBe(1);
		expect(out.map((o) => o.address)).toEqual(outputs.map((o) => o.address));
		for (let i = 0; i < out.length; i++) {
			expect(out[i].options.slice(-outputs[i].options.length)).toEqual(outputs[i].options);
			expect(out[i].options.length).toBeGreaterThan(outputs[i].options.length);
		}
		expect(outputs).toEqual(outputsMatrix[2]);
	});
});
