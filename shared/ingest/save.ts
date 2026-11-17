// Saving a channel: the sequence both the editor and the wizard run (legacy Edit/index.js and
// Wizard/index.js `handleDone`), in one place.
import * as Encoders from '../coders/encoders';
import * as M from '../metadata';
import type { IngestMetadata } from '../metadata';

/** The part of the core client this needs (see shared/core/restreamer.ts). */
export interface IngestSaveClient {
	UpsertIngest(
		channelid: string,
		global: string[],
		inputs: unknown[],
		outputs: unknown[],
		control: IngestMetadata['control'],
		options?: { videoCodec?: string },
	): Promise<[unknown, { message: string } | null]>;
	SetIngestMetadata(channelid: string, metadata: IngestMetadata): Promise<boolean>;
	UpsertIngestSnapshot(channelid: string, control: IngestMetadata['control']): Promise<[unknown, { message: string } | null]>;
	UpdatePlayer(channelid: string): Promise<boolean>;
	UpdatePlayersite(): Promise<boolean>;
}

export type IngestSaveProblem =
	| { step: 'profile' }
	| { step: 'ingest'; message: string }
	| { step: 'metadata' }
	| { step: 'snapshot'; message: string }
	| { step: 'player' }
	| { step: 'playersite' };

export interface IngestSaveResult {
	// False when nothing was saved (incomplete profile, or the core refused the process).
	ok: boolean;
	// Why it failed, or — when ok — what went wrong in the follow-up steps.
	problems: IngestSaveProblem[];
	// The metadata as stored (streams filled in, HLS version possibly raised for AV1).
	metadata: IngestMetadata;
}

/** Codec of the video stream the channel's first profile produces ('' if it has none). */
export function outputVideoCodec(metadata: Pick<IngestMetadata, 'sources' | 'profiles'>): string {
	const streams = M.createOutputStreams(metadata.sources, metadata.profiles);
	return streams.find((stream) => stream.type === 'video')?.codec ?? '';
}

/**
 * An encoder that is selected but has no ffmpeg arguments makes a process ffmpeg refuses to start
 * ("Automatic encoder selection failed"). Such a track gets the arguments of its stored settings,
 * or the encoder's defaults. Stored channels that were saved in that state are repaired by this
 * the next time they are saved.
 */
export function completeEncoders(metadata: IngestMetadata): IngestMetadata {
	for (const profile of metadata.profiles) {
		for (const type of ['video', 'audio'] as const) {
			const track = profile[type];
			if (!track || track.source < 0 || track.stream < 0 || (track.encoder.mapping?.local ?? []).length !== 0) continue;

			// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the coder registry is an untyped port
			const coder = (type === 'video' ? Encoders.Video : Encoders.Audio).Get(track.encoder.coder) as any;
			if (!coder) continue;

			const stream = metadata.sources[track.source]?.streams[track.stream];
			const hasSettings = Object.keys(track.encoder.settings ?? {}).length !== 0;
			const complete =
				hasSettings && coder.createMapping
					? { settings: track.encoder.settings, mapping: coder.createMapping(track.encoder.settings, stream) }
					: coder.defaults(stream);

			track.encoder = { ...track.encoder, codec: coder.codec, settings: complete.settings, mapping: complete.mapping };
		}
	}

	return metadata;
}

export async function saveIngest(client: IngestSaveClient, channelid: string, data: IngestMetadata): Promise<IngestSaveResult> {
	// The caller keeps editing its own object; the core client mutates what it is given.
	const metadata: IngestMetadata = completeEncoders(JSON.parse(JSON.stringify(data)));
	const problems: IngestSaveProblem[] = [];

	// createInputsOutputs() prepends decoder options to the inputs it is handed; work on a copy
	// so that saving twice does not store duplicated options.
	// (metadata.ts is an untyped port; this is what createInputsOutputs() returns.)
	const [global, inputs, outputs] = M.createInputsOutputs(JSON.parse(JSON.stringify(metadata.sources)), metadata.profiles, true) as [
		string[],
		unknown[],
		unknown[],
	];

	if (inputs.length === 0 || outputs.length === 0) {
		return { ok: false, problems: [{ step: 'profile' }], metadata };
	}

	metadata.streams = M.createOutputStreams(metadata.sources, metadata.profiles);
	const videoCodec = metadata.streams.find((stream) => stream.type === 'video')?.codec || undefined;

	const [, ingestError] = await client.UpsertIngest(channelid, global, inputs, outputs, metadata.control, { videoCodec });
	if (ingestError !== null) {
		return { ok: false, problems: [{ step: 'ingest', message: ingestError.message }], metadata };
	}

	if ((await client.SetIngestMetadata(channelid, metadata)) === false) {
		problems.push({ step: 'metadata' });
	}

	const [, snapshotError] = await client.UpsertIngestSnapshot(channelid, metadata.control);
	if (snapshotError !== null) {
		problems.push({ step: 'snapshot', message: snapshotError.message });
	}

	if ((await client.UpdatePlayer(channelid)) === false) {
		problems.push({ step: 'player' });
	}

	if ((await client.UpdatePlayersite()) === false) {
		problems.push({ step: 'playersite' });
	}

	return { ok: true, problems, metadata };
}
