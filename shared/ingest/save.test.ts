// @ts-nocheck -- drives the still-untyped core client against the fake core.
import { afterAll, describe, expect, test } from 'bun:test';

import { FakeCore } from '../__fixtures__/core/fake-core';
import Restreamer from '../core/restreamer';
import * as M from '../metadata';
import { outputVideoCodec, saveIngest } from './save';

const realFetch = globalThis.fetch;
const realError = console.error;
const clients = [];

afterAll(() => {
	globalThis.fetch = realFetch;
	console.error = realError;
	for (const client of clients) client.Reset?.();
});

// The client logs every failed API call; the fake core answers 404 for things that do not exist yet.
console.error = () => {};

async function connect() {
	const core = new FakeCore();
	core.install();

	const client = new Restreamer('http://core.test:8080');
	clients.push(client);
	expect(await client.Validate()).toBe(true);
	expect(await client.Login('admin', 'secret')).toBe(true);

	return { core, client, channelid: client.GetCurrentChannelID() };
}

// A channel with one network source carrying `videoCodec` video and AAC audio, both passed through.
function channel(videoCodec: string, control = {}) {
	const metadata = M.initIngestMetadata({});
	metadata.meta.name = 'Stage';
	metadata.sources = [
		M.initSource('network', {
			type: 'network',
			settings: {},
			inputs: [{ address: 'rtmp://example.com/live/stream', options: ['-fflags', '+genpts'] }],
			streams: [
				{ url: '', index: 0, stream: 0, type: 'video', codec: videoCodec, width: 1920, height: 1080, pix_fmt: 'yuv420p' },
				{ url: '', index: 0, stream: 1, type: 'audio', codec: 'aac', sampling_hz: 48000, layout: 'stereo', channels: 2 },
			],
		}),
	];

	const encoders = { video: ['copy', 'none', 'libx264'], audio: ['copy', 'none', 'aac'] };
	let profile = M.initProfile({});
	profile = M.preselectProfile('video', metadata.sources[0].streams, profile, encoders);
	profile.audio.source = 0;
	profile.audio.stream = 1;
	profile.audio.encoder.coder = 'copy';
	profile.audio.encoder.mapping = { global: [], local: ['-codec:a', 'copy'], filter: [] };
	profile.video.encoder.mapping = { global: [], local: ['-codec:v', 'copy'], filter: [] };
	metadata.profiles = [profile];

	metadata.control = { ...metadata.control, ...control };

	return metadata;
}

const ingestConfig = (core, channelid) =>
	core
		.processRequests()
		.map((r) => r.body)
		.filter((body) => body?.id === `restreamer-ui:ingest:${channelid}` && body.output)
		.at(-1);

describe('saveIngest', () => {
	test('saves process, metadata, snapshot, player and playersite', async () => {
		const { core, client, channelid } = await connect();
		const data = channel('h264');

		const result = await saveIngest(client, channelid, data);

		expect(result.ok).toBe(true);
		expect(result.problems).toEqual([]);
		expect(result.metadata.streams.map((s) => `${s.type}:${s.codec}`)).toEqual(['video:h264', 'audio:aac']);

		const config = ingestConfig(core, channelid);
		expect(config.input[0].address).toBe('rtmp://example.com/live/stream');
		expect(config.output[0].options.slice(0, 10)).toEqual(['-dn', '-sn', '-map', '0:0', '-codec:v', 'copy', '-map', '0:1', '-codec:a', 'copy']);

		expect(core.processes.has(`restreamer-ui:ingest:${channelid}_snapshot`)).toBe(true);
		expect((await client.GetIngestMetadata(channelid)).meta.name).toBe('Stage');
		expect(client.GetChannel(channelid).available).toBe(true);
	});

	test('does not modify the data it is given, and saving twice stores the same process', async () => {
		const { core, client, channelid } = await connect();
		const data = channel('h264');
		const before = JSON.stringify(data);

		await saveIngest(client, channelid, data);
		const first = JSON.stringify(ingestConfig(core, channelid));
		await saveIngest(client, channelid, data);

		expect(JSON.stringify(data)).toBe(before);
		expect(JSON.stringify(ingestConfig(core, channelid))).toBe(first);
	});

	test('an incomplete profile saves nothing', async () => {
		const { core, client, channelid } = await connect();
		const data = M.initIngestMetadata({});
		const requests = core.requests.length;

		const result = await saveIngest(client, channelid, data);

		expect(result).toMatchObject({ ok: false, problems: [{ step: 'profile' }] });
		expect(core.processRequests(requests)).toEqual([]);
	});

	test('hevc: the internal RTMP/SRT re-publish gets the codec-specific tag', async () => {
		const { core, client, channelid } = await connect();

		const result = await saveIngest(client, channelid, channel('hevc', { rtmp: { enable: true }, srt: { enable: true } }));
		expect(result.ok).toBe(true);

		const output = ingestConfig(core, channelid).output[0];
		expect(output.options.slice(output.options.indexOf('-tag:v'), output.options.indexOf('-tag:v') + 2)).toEqual(['-tag:v', '1cvh']);
		expect(output.address).toContain('|[f=flv]{rtmp,');
		expect(output.address).toContain('|[f=mpegts]{srt,');
		expect(result.metadata.control.hls.version).toBe(3);
	});

	test('av1: HLS is switched to fMP4 and the stored metadata says so', async () => {
		const { core, client, channelid } = await connect();

		const result = await saveIngest(client, channelid, channel('av1', { rtmp: { enable: true }, srt: { enable: true } }));
		expect(result.ok).toBe(true);

		const output = ingestConfig(core, channelid).output[0];
		expect(output.address).toContain('hls_segment_type=fmp4');
		expect(output.address).not.toContain('mpegts');
		expect(output.options).toContain('10va');

		expect(result.metadata.control.hls.version).toBe(7);
		expect((await client.GetIngestMetadata(channelid)).control.hls.version).toBe(7);
	});

	test('a failing follow-up step is reported but the channel counts as saved', async () => {
		const { client, channelid } = await connect();
		const flaky = Object.create(client);
		flaky.UpdatePlayer = async () => false;
		flaky.UpsertIngestSnapshot = async () => [null, { message: 'boom' }];

		const result = await saveIngest(flaky, channelid, channel('h264'));

		expect(result.ok).toBe(true);
		expect(result.problems).toEqual([{ step: 'snapshot', message: 'boom' }, { step: 'player' }]);
	});

	test('a refused ingest process stops the save', async () => {
		const { client, channelid } = await connect();
		const refusing = Object.create(client);
		let later = 0;
		refusing.UpsertIngest = async () => [null, { message: 'invalid config' }];
		refusing.SetIngestMetadata = async () => (later++, true);

		const result = await saveIngest(refusing, channelid, channel('h264'));

		expect(result).toMatchObject({ ok: false, problems: [{ step: 'ingest', message: 'invalid config' }] });
		expect(later).toBe(0);
	});
});

describe('outputVideoCodec', () => {
	test('follows the source codec for copy and the encoder otherwise', () => {
		expect(outputVideoCodec(channel('hevc'))).toBe('hevc');

		const encoded = channel('mpeg2video');
		expect(encoded.profiles[0].video.encoder.coder).toBe('libx264');
		expect(outputVideoCodec(encoded)).toBe('h264');

		expect(outputVideoCodec(M.initIngestMetadata({}))).toBe('');
	});
});
