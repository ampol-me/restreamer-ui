// A channel the Studio can go live on is one that waits for a stream on the core's RTMP server
// under its own name — the same kind of channel an encoder such as OBS sends to. The Studio's
// feed arrives there as H.264 and AAC, so the channel passes both through.
import { sendTarget } from '../ingest/sendTo';
import * as M from '../metadata';
import type { IngestMetadata, MetadataStream } from '../metadata';
import * as Network from '../sources/network';
import * as RTMP from '../sources/wizard/internalrtmp';
import type { Quality } from './setup';

/** `networkConfig`: the core's config slice of the network source for this channel (ConfigActive().source.network). */
export function isStudioChannel(metadata: Pick<IngestMetadata, 'sources'>, networkConfig: unknown): boolean {
	return sendTarget(metadata.sources?.[0], networkConfig)?.protocol === 'rtmp';
}

/**
 * The channel's metadata with the Studio as its source. Name, description, licence, player and
 * the process settings stay as they are; the source and what is done with its tracks are replaced.
 */
export function studioIngestMetadata(current: IngestMetadata | null, networkConfig: unknown, skills: unknown, quality: Quality): IngestMetadata {
	const metadata = M.initIngestMetadata(current ? JSON.parse(JSON.stringify(current)) : {}) as IngestMetadata;

	const config = Network.initConfig(networkConfig);
	const settings = RTMP.initSettings({}, config);
	settings.push.name = config.channelid;
	const inputs = Network.func.createInputs(settings, config, skills);
	const address = inputs[0]!.address;
	settings.address = address;

	// What the server's ffmpeg publishes (shared/studio/feed.ts): the channel is not probed,
	// because nothing is arriving yet when it is set up.
	const stream = (values: Partial<MetadataStream>): MetadataStream => ({
		url: address,
		index: 0,
		stream: 0,
		type: '',
		codec: '',
		width: 0,
		height: 0,
		pix_fmt: '',
		sampling_hz: 0,
		layout: '',
		channels: 0,
		...values,
	});
	const streams = [
		stream({ stream: 0, type: 'video', codec: 'h264', width: quality.width, height: quality.height, pix_fmt: 'yuv420p' }),
		stream({ stream: 1, type: 'audio', codec: 'aac', sampling_hz: 48000, layout: 'stereo', channels: 2 }),
	];

	metadata.sources = [M.initSource(Network.id, { type: Network.id, settings, inputs, streams })];

	const profile = M.initProfile({});
	profile.video = { ...profile.video, source: 0, stream: 0 };
	profile.video.encoder = { coder: 'copy', codec: 'h264', settings: {}, mapping: { global: [], local: ['-codec:v', 'copy'], filter: [] } };
	profile.audio = { ...profile.audio, source: 0, stream: 1 };
	profile.audio.encoder = { coder: 'copy', codec: 'aac', settings: {}, mapping: { global: [], local: ['-codec:a', 'copy'], filter: [] } };
	metadata.profiles = [profile];

	return metadata;
}
