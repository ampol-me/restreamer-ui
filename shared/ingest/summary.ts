// What the editor shows for the video/audio half of a profile (legacy Edit/Summary.js).
import * as Coders from '../coders/encoders';
import * as Filters from '../filters';
import type { MetadataProfileTrack, MetadataSource } from '../metadata';

export interface TrackSummary {
	// False when no (valid) source/stream is selected.
	selected: boolean;
	sourceType: string;
	address: string;
	// null = no encoder information to show
	encoding: string | null;
	filters: string[];
}

export function summarizeTrack(type: 'video' | 'audio', sources: MetadataSource[], track: MetadataProfileTrack): TrackSummary {
	const summary: TrackSummary = { selected: false, sourceType: '', address: '', encoding: null, filters: [] };

	const source = track.source >= 0 && track.source < sources.length ? sources[track.source] : undefined;
	const stream = source && track.stream >= 0 && track.stream < source.streams.length ? source.streams[track.stream] : undefined;
	if (!source || !stream) {
		return summary;
	}

	summary.selected = true;
	summary.sourceType = source.type;
	summary.address = decodeURIComponent(String(stream.url ?? '').replace(/^playout:/, ''));

	const coders = type === 'video' ? Coders.Video : Coders.Audio;
	const coder = coders.Get(track.encoder.coder);
	if (coder !== null) {
		summary.encoding = coder.summarize(track.encoder.settings);
	}

	if (track.encoder.coder !== 'none' && track.encoder.coder !== 'copy' && track.filter.graph.length !== 0) {
		const filters = type === 'video' ? Filters.Video : Filters.Audio;
		// The filter registry is an untyped port: { filter: name, summarize(settings) }.
		for (const filter of filters.List() as { filter: string; summarize(settings: unknown): string }[]) {
			const entry = track.filter.settings[filter.filter];
			if (!entry || entry.graph.length === 0) {
				continue;
			}
			summary.filters.push(filter.summarize(entry.settings));
		}
	}

	return summary;
}
