import { describe, expect, test } from 'bun:test';

import { outputVideoCodec } from '../ingest/save';
import { sendTarget } from '../ingest/sendTo';
import * as M from '../metadata';
import { isStudioChannel, studioIngestMetadata } from './channel';
import { QUALITIES } from './setup';

const network = {
	channelid: 'chan-1',
	rtmp: { enabled: true, secure: false, host: 'live.example.com', local: 'localhost', app: '/live', token: 'tok' },
	srt: { enabled: false, host: 'live.example.com:6000', local: 'localhost', token: '', passphrase: '' },
	hls: { secure: true, host: 'live.example.com', local: 'localhost', credentials: '' },
};
const skills = { ffmpeg: { version: '6.1.1', version_major: 6, version_minor: 1 }, codecs: { video: {}, audio: {} } };

describe('a channel for the Studio', () => {
	const metadata = studioIngestMetadata(null, network, skills, QUALITIES['720p']);

	test('waits for a stream on the RTMP server under its own name', () => {
		expect(metadata.sources).toHaveLength(1);
		expect(metadata.sources[0]!.type).toBe('network');
		expect(metadata.sources[0]!.settings).toMatchObject({ mode: 'push', push: { type: 'rtmp', name: 'chan-1' } });
		expect(metadata.sources[0]!.inputs[0]!.address).toBe('{rtmp,name=chan-1.stream}');
		expect(isStudioChannel(metadata, network)).toBe(true);
		// The same channel an encoder could send to.
		expect(sendTarget(metadata.sources[0], network)?.protocol).toBe('rtmp');
	});

	test('passes the H.264 picture and the AAC sound of the feed through', () => {
		expect(metadata.sources[0]!.streams.map((s) => `${s.type}:${s.codec}`)).toEqual(['video:h264', 'audio:aac']);
		expect(metadata.sources[0]!.streams[0]).toMatchObject({ width: 1280, height: 720 });
		expect(outputVideoCodec(metadata)).toBe('h264');

		const [, inputs, outputs] = M.createInputsOutputs(JSON.parse(JSON.stringify(metadata.sources)), metadata.profiles, true) as [
			string[],
			unknown[],
			{ options: string[] }[],
		];
		expect(inputs).toHaveLength(1);
		expect(outputs[0]!.options.join(' ')).toContain('-codec:v copy');
		expect(outputs[0]!.options.join(' ')).toContain('-codec:a copy');
	});

	test('keeps what the channel is called and how it is played, replaces its source', () => {
		const existing = M.initIngestMetadata({}) as M.IngestMetadata;
		existing.meta.name = 'Town hall';
		existing.license = 'CC BY 4.0';
		existing.control.hls.storage = 'diskfs';
		existing.sources = [M.initSource('network', { type: 'network', settings: { mode: 'pull', address: 'rtsp://camera/stream' }, inputs: [], streams: [] })];

		const next = studioIngestMetadata(existing, network, skills, QUALITIES['1080p']);
		expect(next.meta.name).toBe('Town hall');
		expect(next.license).toBe('CC BY 4.0');
		expect(next.control.hls.storage).toBe('diskfs');
		expect(next.sources[0]!.settings.mode).toBe('push');
		expect(next.sources[0]!.streams[0]).toMatchObject({ width: 1920, height: 1080 });
		// The caller's object is not written to.
		expect(existing.sources[0]!.settings.mode).toBe('pull');
	});

	test('other channels are not Studio channels', () => {
		const pull = {
			sources: [M.initSource('network', { type: 'network', settings: { mode: 'pull', address: 'rtsp://camera/stream' }, inputs: [], streams: [] })],
		};
		expect(isStudioChannel(pull, network)).toBe(false);
		expect(isStudioChannel({ sources: [] }, network)).toBe(false);
		expect(isStudioChannel(metadata, { ...network, rtmp: { ...network.rtmp, enabled: false } })).toBe(false);
	});
});
