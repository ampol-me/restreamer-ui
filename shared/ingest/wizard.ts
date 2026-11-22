// The decisions of the channel wizard (legacy Edit/Wizard/index.js), without any UI:
// what to do with a probe result, which coders to offer, how the audio choice maps to
// sources and profile, and how the result becomes channel metadata.
import * as Decoders from '../coders/decoders';
import * as Encoders from '../coders/encoders';
import type { CoreSkills } from '../core/types';
import * as M from '../metadata';
import type { IngestMetadata, MetadataProfile, MetadataSource, MetadataStream } from '../metadata';
import Sources from '../sources';
import { customFor } from './editor';

export type ProbeStatus = 'none' | 'success' | 'error' | 'nostream' | 'nocoder';

/** The two sources the wizard fills: [0] carries the video, [1] an optional separate audio source. */
export interface WizardSources {
	video: MetadataSource;
	audio: MetadataSource;
}

export type AudioChoice = 'video' | 'alsa' | 'silence' | 'none';

interface CoderChoice {
	coder: string;
	name: string;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

export const emptySources = (): WizardSources => ({ video: M.initSource('video', null), audio: M.initSource('audio', null) });

/** Takes a probe result: checks that the wanted stream type is there and preselects stream and coder. */
export function applyProbe(
	type: 'video' | 'audio',
	streams: MetadataStream[],
	profile: MetadataProfile,
	skills: Pick<CoreSkills, 'encoders'>,
): { status: ProbeStatus; profile: MetadataProfile } {
	let status = M.analyzeStreams(type, streams) as ProbeStatus;
	let next = clone(profile);

	if (status === 'success') {
		next = { ...next, ...M.preselectProfile(type, streams, next, skills.encoders) };
		if (next[type].encoder.coder === 'none') {
			status = 'nocoder';
		}
	}

	return { status, profile: next };
}

/** Video streams can be passed through as they are when their codec is one of these. */
export const isVideoCompatible = (stream: Pick<MetadataStream, 'codec'> | undefined): boolean =>
	stream !== undefined && M.defaultVideoCodecs.includes(stream.codec);

export const isAudioCompatible = (stream: Pick<MetadataStream, 'codec'> | undefined): boolean =>
	stream !== undefined && (stream.codec === 'aac' || stream.codec === 'mp3');

/**
 * What the "video result" step offers for a stream that has to be encoded. H.264 encoders come
 * first (what legacy offered, and still the default), followed by the HEVC and AV1 encoders of the core.
 */
export function videoCoderChoices(
	stream: MetadataStream,
	skills: Pick<CoreSkills, 'encoders' | 'decoders'>,
): { encoders: CoderChoice[]; decoders: CoderChoice[] } {
	const pick = (c: { coder: string; name: string }) => ({ coder: c.coder, name: c.name });

	return {
		encoders: M.defaultVideoCodecs.flatMap((codec: string) => Encoders.Video.GetCodersForCodec(codec, skills.encoders.video, 'any')).map(pick),
		decoders: Decoders.Video.GetCodersForCodec(stream.codec, skills.decoders.video, 'any').map(pick),
	};
}

const silenceSource = (): MetadataSource => {
	const source = Sources.Get('virtualaudio')!;
	const settings = source.func.initSettings({ source: 'silence', layout: 'stereo', sampling: '44100' });

	return M.initSource('audio', { type: source.id, settings, inputs: source.func.createInputs(settings) });
};

/**
 * Leaving the "video result" step: the chosen video coders get their default settings, and the
 * audio defaults to the first audio track of the video source, or to silence if it has none.
 */
export function confirmVideo(sources: WizardSources, profile: MetadataProfile, skills: CoreSkills): { sources: WizardSources; profile: MetadataProfile } {
	const next = clone(profile);
	const nextSources = clone(sources);

	const encoder = Encoders.Video.Get(next.video.encoder.coder);
	if (encoder !== null) {
		const defaults = encoder.defaults({}, skills);
		next.video.encoder.settings = defaults.settings;
		next.video.encoder.mapping = defaults.mapping;
	}

	const decoder = Decoders.Video.Get(next.video.decoder.coder);
	if (decoder !== null) {
		const defaults = decoder.defaults({}, skills);
		next.video.decoder.settings = defaults.settings;
		next.video.decoder.mapping = defaults.mapping;
	}

	const audio = nextSources.video.streams.find((s) => s.type === 'audio');
	if (audio) {
		next.audio.source = 0;
		next.audio.stream = audio.stream;
	} else {
		next.audio.source = 1;
		nextSources.audio = silenceSource();
	}

	return { sources: nextSources, profile: next };
}

/** Which radio button of the "audio" step is active. */
export function audioChoice(sources: WizardSources, profile: MetadataProfile): AudioChoice {
	if (profile.audio.source === 0) return 'video';
	if (profile.audio.source === 1) return sources.audio.type === 'alsa' ? 'alsa' : 'silence';
	return 'none';
}

/** The ALSA devices offered for a camera without sound (only hardware video sources get them). */
export function alsaDevices(sources: WizardSources, skills: CoreSkills): { id: string; name: string }[] {
	if (!('alsa' in skills.sources) || !['video4linux2', 'raspicam'].includes(sources.video.type)) {
		return [];
	}

	return skills.sources.alsa as { id: string; name: string }[];
}

export function chooseAudio(
	choice: AudioChoice,
	sources: WizardSources,
	profile: MetadataProfile,
	skills: CoreSkills,
): { sources: WizardSources; profile: MetadataProfile } {
	const next = clone(profile);
	const nextSources = clone(sources);

	if (choice === 'video') {
		next.audio.source = 0;
		nextSources.audio = M.initSource('audio', null);
	} else if (choice === 'alsa') {
		next.audio.source = 1;
		// The first ALSA device is selected by default
		const devices = (skills.sources.alsa ?? []) as { id: string }[];
		nextSources.audio = alsaSource(devices[0]?.id ?? '');
	} else if (choice === 'silence') {
		next.audio.source = 1;
		nextSources.audio = silenceSource();
	} else {
		next.audio.source = -1;
		nextSources.audio = M.initSource('audio', null);
	}

	return { sources: nextSources, profile: next };
}

function alsaSource(address: string): MetadataSource {
	const source = Sources.Get('alsa')!;
	const settings = source.func.initSettings({ address, device: address.replace(/^hw:/, '') });

	return M.initSource('audio', { type: source.id, settings, inputs: source.func.createInputs(settings) });
}

/** Another ALSA device was picked in the "audio" step. */
export function chooseAlsaDevice(address: string, sources: WizardSources): WizardSources {
	return { ...clone(sources), audio: alsaSource(address) };
}

/**
 * Leaving the audio steps: compatible audio (AAC, MP3) is passed through, anything else is
 * encoded to AAC, each with the coder's defaults for that stream.
 */
export function confirmAudio(sources: WizardSources, profile: MetadataProfile, skills: CoreSkills): MetadataProfile {
	const next = clone(profile);

	const source = next.audio.source === 0 ? sources.video : next.audio.source === 1 ? sources.audio : null;
	const stream = source?.streams[next.audio.stream];

	if (!stream) {
		next.audio.source = -1;
		next.audio.stream = -1;
		return next;
	}

	next.audio.encoder.coder = isAudioCompatible(stream) ? 'copy' : 'aac';

	const encoder = Encoders.Audio.Get(next.audio.encoder.coder);
	if (encoder !== null) {
		const defaults = encoder.defaults(stream, skills);
		next.audio.encoder.settings = defaults.settings;
		next.audio.encoder.mapping = defaults.mapping;
	}

	return next;
}

/** The channel metadata the wizard saves. */
export function buildMetadata(data: IngestMetadata, sources: WizardSources, profile: MetadataProfile): IngestMetadata {
	const metadata = clone(data);
	const finalProfile = clone(profile);

	// cleanupProfile() points the audio at the second source only when `custom.selected` is set.
	// The legacy wizard never set it, so a separate audio source (silence, ALSA) was silently
	// replaced by stream 0 of the video input.
	finalProfile.custom = customFor(finalProfile);

	metadata.sources = M.cleanupSources(clone(sources));
	metadata.profiles = [M.cleanupProfile(finalProfile)];

	return metadata;
}
