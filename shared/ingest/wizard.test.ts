import { describe, expect, test } from 'bun:test';

import type { CoreSkills } from '../core/types';
import * as M from '../metadata';
import type { MetadataStream } from '../metadata';
import * as W from './wizard';

const skills = {
	ffmpeg: { version: '6.1.1', version_major: 6, version_minor: 1 },
	encoders: { video: ['copy', 'none', 'libx264', 'libx265', 'librav1e'], audio: ['copy', 'none', 'aac'] },
	decoders: { video: ['default', 'h264_cuvid'], audio: ['default'] },
	filter: [],
	formats: { demuxers: [], muxers: [] },
	protocols: { input: [], output: [] },
	sources: {
		network: [],
		alsa: [
			{ id: 'hw:1,0', name: 'USB Audio' },
			{ id: 'hw:2,0', name: 'HDMI' },
		],
	},
} as unknown as CoreSkills;

const video = (codec: string, stream = 0): MetadataStream =>
	({ url: 'rtsp://cam/stream', index: 0, stream, type: 'video', codec, width: 1920, height: 1080 }) as MetadataStream;
const audio = (codec: string, stream = 1): MetadataStream =>
	({ url: 'rtsp://cam/stream', index: 0, stream, type: 'audio', codec, sampling_hz: 48000, layout: 'stereo', channels: 2 }) as MetadataStream;

const probed = (streams: MetadataStream[], type = 'network') => {
	const sources = W.emptySources();
	sources.video = M.initSource('video', { type, settings: {}, inputs: [{ address: 'rtsp://cam/stream', options: [] }], streams });
	return sources;
};

describe('applyProbe', () => {
	test('statuses', () => {
		const profile = M.initProfile({});
		expect(W.applyProbe('video', [], profile, skills).status).toBe('error');
		expect(W.applyProbe('video', [audio('aac', 0)], profile, skills).status).toBe('nostream');
		expect(W.applyProbe('video', [video('h264'), audio('aac')], profile, skills).status).toBe('success');
		expect(W.applyProbe('video', [video('mpeg2video')], profile, { encoders: { video: ['copy', 'none'], audio: [] } }).status).toBe('nocoder');
	});

	test('h264, hevc and av1 are passed through; other codecs get the H.264 encoder', () => {
		for (const codec of ['h264', 'hevc', 'av1']) {
			expect(W.applyProbe('video', [video(codec)], M.initProfile({}), skills).profile.video.encoder.coder).toBe('copy');
		}
		expect(W.applyProbe('video', [video('mpeg2video')], M.initProfile({}), skills).profile.video.encoder.coder).toBe('libx264');
	});

	test('does not modify the profile it is given', () => {
		const profile = M.initProfile({});
		const before = JSON.stringify(profile);
		W.applyProbe('video', [video('h264')], profile, skills);
		expect(JSON.stringify(profile)).toBe(before);
	});
});

test('videoCoderChoices offers H.264 first, then HEVC and AV1 encoders the core has', () => {
	const choices = W.videoCoderChoices(video('mpeg2video'), skills);
	expect(choices.encoders.map((c) => c.coder)).toEqual(['libx264', 'libx265', 'librav1e']);
	expect(W.videoCoderChoices(video('h264'), skills).decoders.map((c) => c.coder)).toContain('h264_cuvid');
	expect(W.isVideoCompatible(video('hevc'))).toBe(true);
	expect(W.isVideoCompatible(video('vp9'))).toBe(false);
	expect(W.isVideoCompatible(undefined)).toBe(false);
});

describe('confirmVideo', () => {
	test('uses the audio track of the video source when there is one', () => {
		const sources = probed([video('h264'), audio('aac')]);
		const { profile } = W.applyProbe('video', sources.video.streams, M.initProfile({}), skills);

		const result = W.confirmVideo(sources, profile, skills);

		expect(result.profile.video.encoder.mapping.local).toEqual(['-codec:v', 'copy']);
		expect([result.profile.audio.source, result.profile.audio.stream]).toEqual([0, 1]);
		expect(result.sources.audio.type).toBe('');
		expect(W.audioChoice(result.sources, result.profile)).toBe('video');
	});

	test('falls back to silence when the video source has no audio', () => {
		const sources = probed([video('h264')]);
		const { profile } = W.applyProbe('video', sources.video.streams, M.initProfile({}), skills);

		const result = W.confirmVideo(sources, profile, skills);

		expect(result.profile.audio.source).toBe(1);
		expect(result.sources.audio.type).toBe('virtualaudio');
		expect(result.sources.audio.inputs[0]!.address).toBe('anullsrc=r=44100:cl=stereo');
		expect(W.audioChoice(result.sources, result.profile)).toBe('silence');
	});

	test('an encoder chosen for an incompatible stream gets its default settings', () => {
		const sources = probed([video('mpeg2video')]);
		const { profile } = W.applyProbe('video', sources.video.streams, M.initProfile({}), skills);
		profile.video.encoder.coder = 'libx265';

		const result = W.confirmVideo(sources, profile, skills);

		expect(result.profile.video.encoder.settings.bitrate).toBe('4096');
		expect(result.profile.video.encoder.mapping.local.slice(0, 2)).toEqual(['-codec:v', 'libx265']);
	});
});

describe('audio step', () => {
	const start = () => {
		const sources = probed([video('h264'), audio('pcm_alaw')], 'video4linux2');
		const { profile } = W.applyProbe('video', sources.video.streams, M.initProfile({}), skills);
		return W.confirmVideo(sources, profile, skills);
	};

	test('ALSA devices are only offered for hardware video sources', () => {
		expect(W.alsaDevices(start().sources, skills).map((d) => d.id)).toEqual(['hw:1,0', 'hw:2,0']);
		expect(W.alsaDevices(probed([video('h264')], 'network'), skills)).toEqual([]);
	});

	test('choices map to source and profile', () => {
		const s = start();

		const alsa = W.chooseAudio('alsa', s.sources, s.profile, skills);
		expect(alsa.profile.audio.source).toBe(1);
		expect(alsa.sources.audio.type).toBe('alsa');
		expect(alsa.sources.audio.settings.address).toBe('hw:1,0');
		expect(W.audioChoice(alsa.sources, alsa.profile)).toBe('alsa');

		const other = W.chooseAlsaDevice('hw:2,0', alsa.sources);
		expect(other.audio.settings).toMatchObject({ address: 'hw:2,0', device: '2,0' });
		expect(other.audio.inputs[0]!.address).toContain('2,0');

		const none = W.chooseAudio('none', alsa.sources, alsa.profile, skills);
		expect(none.profile.audio.source).toBe(-1);
		expect(none.sources.audio.type).toBe('');
		expect(W.audioChoice(none.sources, none.profile)).toBe('none');

		const back = W.chooseAudio('video', none.sources, none.profile, skills);
		expect(W.audioChoice(back.sources, back.profile)).toBe('video');
	});

	test('confirmAudio: compatible audio is copied, anything else becomes AAC, none stays none', () => {
		const aac = probed([video('h264'), audio('aac')]);
		let profile = W.confirmVideo(aac, W.applyProbe('video', aac.video.streams, M.initProfile({}), skills).profile, skills).profile;
		expect(W.confirmAudio(aac, profile, skills).audio.encoder.coder).toBe('copy');

		const pcm = probed([video('h264'), audio('pcm_alaw')]);
		profile = W.confirmVideo(pcm, W.applyProbe('video', pcm.video.streams, M.initProfile({}), skills).profile, skills).profile;
		const encoded = W.confirmAudio(pcm, profile, skills);
		expect(encoded.audio.encoder.coder).toBe('aac');
		expect(encoded.audio.encoder.mapping.local.slice(0, 2)).toEqual(['-codec:a', 'aac']);

		const none = W.chooseAudio('none', pcm, profile, skills);
		const without = W.confirmAudio(none.sources, none.profile, skills);
		expect([without.audio.source, without.audio.stream]).toEqual([-1, -1]);
	});
});

describe('buildMetadata', () => {
	test('a separate audio source is kept as the second input (legacy mapped it onto the video input)', () => {
		const sources = probed([video('h264')]);
		let { profile } = W.applyProbe('video', sources.video.streams, M.initProfile({}), skills);
		const confirmed = W.confirmVideo(sources, profile, skills);

		// the wizard probes the silence source next
		confirmed.sources.audio.streams = [
			{ url: 'anullsrc', index: 0, stream: 0, type: 'audio', codec: 'pcm_u8', sampling_hz: 44100, layout: 'stereo', channels: 2 } as MetadataStream,
		];
		profile = W.applyProbe('audio', confirmed.sources.audio.streams, confirmed.profile, skills).profile;
		profile = W.confirmAudio(confirmed.sources, profile, skills);

		const metadata = W.buildMetadata(M.initIngestMetadata({}), confirmed.sources, profile);

		expect(metadata.sources.map((s) => s.type)).toEqual(['network', 'virtualaudio']);
		expect(metadata.profiles[0]!.audio.source).toBe(1);

		const [, inputs, outputs] = M.createInputsOutputs(JSON.parse(JSON.stringify(metadata.sources)), metadata.profiles, true) as [
			unknown,
			{ address: string }[],
			{ options: string[] }[],
		];
		expect(inputs.map((i) => i.address)).toEqual(['rtsp://cam/stream', 'anullsrc=r=44100:cl=stereo']);
		expect(outputs[0]!.options.slice(0, 8)).toEqual(['-map', '0:0', '-codec:v', 'copy', '-map', '1:0', '-codec:a', 'aac']);
	});

	test('audio from the video source stays on the first input', () => {
		const sources = probed([video('hevc'), audio('aac')]);
		let { profile } = W.applyProbe('video', sources.video.streams, M.initProfile({}), skills);
		const confirmed = W.confirmVideo(sources, profile, skills);
		profile = W.confirmAudio(confirmed.sources, confirmed.profile, skills);

		const metadata = W.buildMetadata(M.initIngestMetadata({}), confirmed.sources, profile);
		const [, inputs, outputs] = M.createInputsOutputs(JSON.parse(JSON.stringify(metadata.sources)), metadata.profiles, true) as [
			unknown,
			{ address: string }[],
			{ options: string[] }[],
		];

		expect(inputs.length).toBe(1);
		expect(outputs[0]!.options.slice(0, 8)).toEqual(['-map', '0:0', '-codec:v', 'copy', '-map', '0:1', '-codec:a', 'copy']);
		expect(M.createOutputStreams(metadata.sources, metadata.profiles).map((s: MetadataStream) => s.codec)).toEqual(['hevc', 'aac']);
	});
});
