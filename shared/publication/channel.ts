// What a publication needs to know about the channel it publishes (legacy: the first half of load() in
// views/Publication/Add.js and Edit.js).
import type { IngestMetadata, MetadataSource } from '../metadata';
import { createSourcesFromStreams } from './helper';

export interface PublicationChannel {
	// Handed to the services, which may put the channel's texts into their outputs.
	metadata: { name: string; description: string; license: string };
	// Where a publication may read the channel from: 'hls+memfs' | 'hls+diskfs' | 'rtmp' | 'srt'.
	localSources: string[];
	// The channel's streams as the single source of the publication's profile.
	sources: MetadataSource[];
}

export function describeChannel(ingest: IngestMetadata): PublicationChannel {
	const localSources = ['hls+' + ingest.control.hls.storage];

	if (ingest.control.rtmp.enable) {
		localSources.push('rtmp');
	}

	if (ingest.control.srt.enable) {
		localSources.push('srt');
	}

	return {
		metadata: { name: ingest.meta.name, description: ingest.meta.description, license: ingest.license },
		localSources,
		sources: createSourcesFromStreams(ingest.streams),
	};
}
