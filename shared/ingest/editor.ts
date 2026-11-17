// The decisions of the channel's source/encoding editor (legacy Edit/Profile.js), without UI.
import type { CoreSkills } from '../core/types';
import * as M from '../metadata';
import type { MetadataProfile, MetadataProfileTrack, MetadataSource, MetadataStream } from '../metadata';
import type { SourceInput, SourceSettings } from '../sources/types';
import type { ProbeStatus, WizardSources } from './wizard';

export interface EditorState {
	sources: WizardSources;
	profile: MetadataProfile;
}

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

const hasAudio = (streams: MetadataStream[]) => streams.some((s) => s.type === 'audio');

const toInputs = (inputs: SourceInput[]) => inputs.map((i) => ({ address: i.address, options: i.options.map(String) }));

/** Editor state for stored channel metadata: sources[0] is the video source, sources[1] the audio source. */
export function fromMetadata(sources: MetadataSource[], profile: MetadataProfile | undefined): EditorState {
	const state: EditorState = {
		sources: { video: M.initSource('video', clone(sources[0] ?? null)), audio: M.initSource('audio', clone(sources[1] ?? null)) },
		profile: M.initProfile(clone(profile ?? {})),
	};

	state.profile.custom = customFor(state.profile);

	// Channels set up by the wizard have no type on the audio source when the audio comes from
	// the video source or is absent; the editor shows those as its pseudo sources.
	if (state.sources.audio.type === '' && state.sources.video.type !== '') {
		state.sources.audio.type = state.profile.audio.source === 0 ? 'videoaudio' : 'noaudio';
	}

	return state;
}

/**
 * `profile.custom` says where the audio comes from, for the editor and for cleanupProfile().
 * It is derived from the audio selection: stored profiles are not reliable here (the legacy
 * wizard never set it).
 */
export function customFor(profile: Pick<MetadataProfile, 'audio'>): MetadataProfile['custom'] {
	if (profile.audio.source === 1) return { selected: true, stream: -2 };
	if (profile.audio.source === 0 && profile.audio.stream >= 0) return { selected: false, stream: profile.audio.stream };
	return { selected: false, stream: -1 };
}

/**
 * The source types offered for audio: what the core has, plus the pseudo sources "no audio" and,
 * when the video source carries audio, "audio of the video source".
 */
export function audioSourceIds(state: EditorState, skills: Pick<CoreSkills, 'sources'>): string[] {
	const ids = Object.keys(skills.sources).filter((id) => id !== 'noaudio' && id !== 'videoaudio');
	ids.push('noaudio');
	if (hasAudio(state.sources.video.streams)) {
		ids.push('videoaudio');
	}
	return ids;
}

/** A probe of the video source came back. Also settles what the audio defaults to. */
export function applyVideoProbe(
	state: EditorState,
	device: string,
	settings: SourceSettings,
	inputs: SourceInput[],
	streams: MetadataStream[],
	skills: Pick<CoreSkills, 'encoders'>,
): { state: EditorState; status: ProbeStatus; audioStatus: ProbeStatus } {
	const status = M.analyzeStreams('video', streams) as ProbeStatus;
	const audio = clone(state.sources.audio);

	// The audio is only preselected along with the video while no audio source has been chosen.
	const profile: MetadataProfile = {
		...clone(state.profile),
		...M.preselectProfile('video', streams, clone(state.profile), skills.encoders, audio.type === ''),
	};

	if (hasAudio(streams)) {
		if (audio.type === '') {
			audio.type = 'videoaudio';
		}
	} else if (audio.type === '' || audio.type === 'videoaudio') {
		audio.type = 'noaudio';
		profile.audio.source = -1;
		profile.audio.stream = -1;
		profile.custom.selected = false;
		profile.custom.stream = -1;
	}

	return {
		state: {
			sources: { video: { type: device, settings, inputs: toInputs(inputs), streams }, audio: M.initSource('audio', audio) },
			profile,
		},
		status,
		audioStatus: audio.type === 'noaudio' ? 'success' : 'none',
	};
}

/** A probe of the separate audio source came back. */
export function applyAudioProbe(
	state: EditorState,
	device: string,
	settings: SourceSettings,
	inputs: SourceInput[],
	streams: MetadataStream[],
	skills: Pick<CoreSkills, 'encoders'>,
): { state: EditorState; status: ProbeStatus } {
	const status = M.analyzeStreams('audio', streams) as ProbeStatus;
	const profile: MetadataProfile = { ...clone(state.profile), ...M.preselectProfile('audio', streams, clone(state.profile), skills.encoders) };

	return {
		state: { sources: { ...clone(state.sources), audio: { type: device, settings, inputs: toInputs(inputs), streams } }, profile },
		status,
	};
}

/** Another source type was picked for the video or the audio. */
export function changeSource(state: EditorState, type: 'video' | 'audio', source: string): EditorState {
	const next = clone(state);

	if (type === 'video') {
		next.sources.video.type = source;
		return next;
	}

	const { audio, custom } = next.profile;

	if (source === 'noaudio') {
		custom.selected = false;
		custom.stream = -1;
		audio.source = -1;
		audio.stream = -1;
	} else if (source === 'videoaudio') {
		custom.selected = false;
		audio.source = 0;
		const index = next.sources.video.streams.findIndex((s) => s.type === 'audio');
		if (index !== -1) {
			custom.stream = index;
			audio.stream = index;
		}
	} else {
		custom.selected = true;
		custom.stream = -2;
		audio.source = 1;
		audio.stream = -1;
	}

	next.sources.audio.type = source;

	return next;
}

/** Another stream of the source was picked. `fromVideo` marks the audio stream taken from the video source. */
export function selectStream(state: EditorState, type: 'video' | 'audio', stream: number, fromVideo = false): EditorState {
	const next = clone(state);
	next.profile[type].stream = stream;
	if (fromVideo) {
		next.profile.custom.stream = stream;
	}
	return next;
}

/**
 * The encoder form and the filter form of a track both report their defaults when they appear,
 * in the same tick, each as "the track as I was given it, with my part changed". Taking either
 * report as the whole track drops what the other one set (a track ended up with a filter and an
 * encoder without arguments, which ffmpeg refuses). So each report changes only its own part.
 */
export function withEncoding(state: EditorState, type: 'video' | 'audio', track: MetadataProfileTrack): EditorState {
	const current = state.profile[type];
	return { ...state, profile: { ...state.profile, [type]: { ...current, encoder: track.encoder, decoder: track.decoder } } };
}

export function withFilter(state: EditorState, type: 'video' | 'audio', track: MetadataProfileTrack): EditorState {
	const current = state.profile[type];
	return { ...state, profile: { ...state.profile, [type]: { ...current, filter: track.filter } } };
}

/** What the editor hands back: the two sources and the cleaned-up profile. */
export function finish(state: EditorState): { sources: MetadataSource[]; profile: MetadataProfile } {
	return { sources: M.cleanupSources(clone(state.sources)), profile: M.cleanupProfile(clone(state.profile)) as MetadataProfile };
}
