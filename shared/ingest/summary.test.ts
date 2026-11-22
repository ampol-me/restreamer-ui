import { expect, test } from 'bun:test';

import * as M from '../metadata';
import { summarizeTrack } from './summary';

const sources = [
	{
		type: 'network',
		settings: {},
		inputs: [],
		streams: [
			{ url: 'playout:rtsp%3A%2F%2Fcam.example%2Fstream', index: 0, stream: 0, type: 'video', codec: 'h264' },
			{ url: 'rtsp://cam.example/stream', index: 0, stream: 1, type: 'audio', codec: 'pcm_alaw' },
		],
	},
] as never;

test('nothing selected', () => {
	const profile = M.initProfile({});
	expect(summarizeTrack('video', sources, profile.video)).toEqual({ selected: false, sourceType: '', address: '', encoding: null, filters: [] });
	expect(summarizeTrack('video', [], { ...profile.video, source: 0, stream: 0 })).toMatchObject({ selected: false });
	expect(summarizeTrack('video', sources, { ...profile.video, source: 0, stream: 9 })).toMatchObject({ selected: false });
});

test('copied video shows the decoded playout address', () => {
	const profile = M.initProfile({});
	const track = { ...profile.video, source: 0, stream: 0, encoder: { ...profile.video.encoder, coder: 'copy' } };
	expect(summarizeTrack('video', sources, track)).toEqual({
		selected: true,
		sourceType: 'network',
		address: 'rtsp://cam.example/stream',
		encoding: 'Passthrough (copy)',
		filters: [],
	});
});

test('encoded audio lists its active filters', () => {
	const profile = M.initProfile({});
	const track = {
		...profile.audio,
		source: 0,
		stream: 1,
		encoder: { ...profile.audio.encoder, coder: 'aac', settings: { bitrate: '64' } },
		filter: {
			graph: 'aresample=osr=48000:ochl=stereo',
			settings: {
				aresample: { graph: 'aresample=osr=48000:ochl=stereo', settings: { channels: '2', layout: 'stereo', sampling: '48000' } },
				volume: { graph: '', settings: {} },
			},
		},
	};

	const summary = summarizeTrack('audio', sources, track as never);
	expect(summary.encoding).toContain('AAC');
	expect(summary.filters.length).toBe(1);
	expect(summary.filters[0]).toContain('48000');

	// filters are not applied to copied or disabled streams
	expect(summarizeTrack('audio', sources, { ...track, encoder: { ...track.encoder, coder: 'copy' } } as never).filters).toEqual([]);
});

test('an unknown coder leaves the encoding empty', () => {
	const profile = M.initProfile({});
	const track = { ...profile.video, source: 0, stream: 0, encoder: { ...profile.video.encoder, coder: 'does-not-exist' } };
	expect(summarizeTrack('video', sources, track).encoding).toBeNull();
});
