import { describe, expect, test } from 'bun:test';

import type { CoreSkills } from '../core/types';
import * as M from '../metadata';
import type { MetadataStream } from '../metadata';
import * as E from './editor';

const skills = {
	encoders: { video: ['copy', 'none', 'libx264', 'libx265'], audio: ['copy', 'none', 'aac'] },
	sources: { network: [], alsa: [], virtualaudio: [] },
} as unknown as CoreSkills;

const video = (codec: string): MetadataStream =>
	({ url: 'rtsp://cam/s', index: 0, stream: 0, type: 'video', codec, width: 1920, height: 1080 }) as MetadataStream;
const audio = (codec: string, stream = 1): MetadataStream =>
	({ url: 'rtsp://cam/s', index: 0, stream, type: 'audio', codec, sampling_hz: 48000, layout: 'stereo', channels: 2 }) as MetadataStream;
const inputs = [{ address: 'rtsp://cam/s', options: ['-timeout', 5000000] }];

const empty = () => E.fromMetadata([], undefined);

describe('applyVideoProbe', () => {
	test('video with audio: the audio defaults to the video source', () => {
		const { state, status, audioStatus } = E.applyVideoProbe(
			empty(),
			'network',
			{ address: 'rtsp://cam/s' },
			inputs,
			[video('hevc'), audio('aac')],
			skills,
		);

		expect(status).toBe('success');
		expect(audioStatus).toBe('none');
		expect(state.sources.video).toMatchObject({ type: 'network', settings: { address: 'rtsp://cam/s' } });
		// option values are stored as strings
		expect(state.sources.video.inputs).toEqual([{ address: 'rtsp://cam/s', options: ['-timeout', '5000000'] }]);
		expect(state.profile.video.encoder.coder).toBe('copy');
		expect(state.sources.audio.type).toBe('videoaudio');
		expect([state.profile.audio.source, state.profile.audio.stream, state.profile.audio.encoder.coder]).toEqual([0, 1, 'copy']);
		expect(E.audioSourceIds(state, skills)).toEqual(['network', 'alsa', 'virtualaudio', 'noaudio', 'videoaudio']);
	});

	test('video without audio: the audio becomes "no audio"', () => {
		const { state, audioStatus } = E.applyVideoProbe(empty(), 'network', {}, inputs, [video('h264')], skills);

		expect(audioStatus).toBe('success');
		expect(state.sources.audio.type).toBe('noaudio');
		expect([state.profile.audio.source, state.profile.audio.stream]).toEqual([-1, -1]);
		expect(E.audioSourceIds(state, skills)).not.toContain('videoaudio');
	});

	test('a chosen separate audio source survives re-probing the video', () => {
		let state = E.applyVideoProbe(empty(), 'network', {}, inputs, [video('h264'), audio('aac')], skills).state;
		state = E.changeSource(state, 'audio', 'virtualaudio');
		state = E.applyAudioProbe(state, 'virtualaudio', {}, [{ address: 'anullsrc', options: ['-f', 'lavfi'] }], [audio('pcm_u8', 0)], skills).state;
		expect(state.profile.audio.encoder.coder).toBe('aac');

		const again = E.applyVideoProbe(state, 'network', {}, inputs, [video('h264')], skills).state;

		expect(again.sources.audio.type).toBe('virtualaudio');
		expect(again.profile.audio.source).toBe(1);
		expect(again.profile.custom.selected).toBe(true);
	});

	test('failed probes are reported and do not select a stream', () => {
		expect(E.applyVideoProbe(empty(), 'network', {}, inputs, [], skills).status).toBe('error');
		const noVideo = E.applyVideoProbe(empty(), 'network', {}, inputs, [audio('aac', 0)], skills);
		expect(noVideo.status).toBe('nostream');
		expect(noVideo.state.profile.video.stream).toBe(-1);
	});

	test('does not modify the state it is given', () => {
		const state = empty();
		const before = JSON.stringify(state);
		E.applyVideoProbe(state, 'network', {}, inputs, [video('h264'), audio('aac')], skills);
		expect(JSON.stringify(state)).toBe(before);
	});
});

describe('changeSource (audio)', () => {
	const probed = () => E.applyVideoProbe(empty(), 'network', {}, inputs, [video('h264'), audio('mp2'), audio('aac', 2)], skills).state;

	test('no audio', () => {
		const state = E.changeSource(probed(), 'audio', 'noaudio');
		expect(state.sources.audio.type).toBe('noaudio');
		expect(state.profile.audio).toMatchObject({ source: -1, stream: -1 });
		expect(state.profile.custom).toEqual({ selected: false, stream: -1 });
	});

	test('audio of the video source picks its first audio stream', () => {
		const state = E.changeSource(E.changeSource(probed(), 'audio', 'noaudio'), 'audio', 'videoaudio');
		expect(state.profile.audio).toMatchObject({ source: 0, stream: 1 });
		expect(state.profile.custom).toEqual({ selected: false, stream: 1 });

		const other = E.selectStream(state, 'audio', 2, true);
		expect([other.profile.audio.stream, other.profile.custom.stream]).toEqual([2, 2]);
	});

	test('a separate source waits for its own probe', () => {
		const state = E.changeSource(probed(), 'audio', 'alsa');
		expect(state.profile.audio).toMatchObject({ source: 1, stream: -1 });
		expect(state.profile.custom).toEqual({ selected: true, stream: -2 });
	});
});

describe('finish', () => {
	test('round trip through the stored form keeps a separate audio source on input 1', () => {
		let state = E.applyVideoProbe(empty(), 'network', {}, inputs, [video('h264')], skills).state;
		state = E.changeSource(state, 'audio', 'virtualaudio');
		state = E.applyAudioProbe(state, 'virtualaudio', {}, [{ address: 'anullsrc', options: ['-f', 'lavfi'] }], [audio('pcm_u8', 0)], skills).state;
		state.profile.video.encoder.mapping = { global: [], local: ['-codec:v', 'copy'], filter: [] };
		state.profile.audio.encoder.mapping = { global: [], local: ['-codec:a', 'aac'], filter: [] };

		const { sources, profile } = E.finish(state);

		expect(sources.map((s) => s.type)).toEqual(['network', 'virtualaudio']);
		expect(M.validateProfile(sources, profile)).toBe(true);

		const [, ins, outs] = M.createInputsOutputs(JSON.parse(JSON.stringify(sources)), [profile], true) as [
			unknown,
			{ address: string }[],
			{ options: string[] }[],
		];
		expect(ins.map((i) => i.address)).toEqual(['rtsp://cam/s', 'anullsrc']);
		expect(outs[0]!.options.slice(0, 8)).toEqual(['-map', '0:0', '-codec:v', 'copy', '-map', '1:0', '-codec:a', 'aac']);

		// …and loading it again gives the editor the same picture
		const reloaded = E.fromMetadata(sources, profile);
		expect(reloaded.sources.audio.type).toBe('virtualaudio');
		expect(reloaded.profile.custom.selected).toBe(true);
	});
});

describe('fromMetadata', () => {
	const stored = (audio: { source: number; stream: number }, custom?: { selected: boolean; stream: number }, audioSource?: object) => {
		const profile = M.initProfile({});
		profile.video = { ...profile.video, source: 0, stream: 0 };
		profile.audio = { ...profile.audio, ...audio };
		if (custom) profile.custom = custom;
		const sources = [{ type: 'network', settings: {}, inputs: [], streams: [video('h264'), audio.source === 0 ? audio_('aac') : null].filter(Boolean) }];
		if (audioSource) sources.push(audioSource as never);
		return E.fromMetadata(sources as never, profile);
	};
	const audio_ = audio;

	test('a wizard-made channel with audio from the video source opens on "Video source" with its stream', () => {
		// what the (legacy) wizard stores: no custom marker, no second source type
		const state = stored({ source: 0, stream: 1 }, { selected: false, stream: -1 }, { type: '', settings: {}, inputs: [], streams: [] });
		expect(state.profile.custom).toEqual({ selected: false, stream: 1 });
		expect(state.sources.audio.type).toBe('videoaudio');
	});

	test('a channel without audio opens on "No audio"', () => {
		const state = stored({ source: -1, stream: -1 });
		expect(state.profile.custom).toEqual({ selected: false, stream: -1 });
		expect(state.sources.audio.type).toBe('noaudio');
	});

	test('a separate audio source is recognised whatever the stored marker says', () => {
		const state = stored(
			{ source: 1, stream: 0 },
			{ selected: false, stream: -1 },
			{ type: 'alsa', settings: {}, inputs: [], streams: [audio('pcm_s16le', 0)] },
		);
		expect(state.profile.custom).toEqual({ selected: true, stream: -2 });
		expect(state.sources.audio.type).toBe('alsa');
	});

	test('a new channel starts empty', () => {
		const state = E.fromMetadata([], undefined);
		expect(state.sources.audio.type).toBe('');
		expect(state.profile.custom).toEqual({ selected: false, stream: -1 });
	});
});
