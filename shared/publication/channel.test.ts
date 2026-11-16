import { describe, expect, test } from 'bun:test';

import { getDefaultIngestMetadata, type IngestMetadata } from '../metadata';
import { describeChannel } from './channel';

function ingest(change: (data: IngestMetadata) => void): IngestMetadata {
	const data: IngestMetadata = getDefaultIngestMetadata();
	change(data);
	return data;
}

describe('describeChannel', () => {
	test('offers the HLS storage of the channel, and RTMP and SRT only if enabled', () => {
		const memfs = ingest((data) => {
			data.control.hls.storage = 'memfs';
			data.control.rtmp.enable = false;
			data.control.srt.enable = false;
		});
		expect(describeChannel(memfs).localSources).toEqual(['hls+memfs']);

		const all = ingest((data) => {
			data.control.hls.storage = 'diskfs';
			data.control.rtmp.enable = true;
			data.control.srt.enable = true;
		});
		expect(describeChannel(all).localSources).toEqual(['hls+diskfs', 'rtmp', 'srt']);
	});

	test('hands the channel texts and its streams on', () => {
		const data = ingest((d) => {
			d.meta.name = 'Livestream';
			d.meta.description = 'From the roof';
			d.license = 'CC BY 4.0';
			d.streams = [{ url: '', index: 0, stream: 0, type: 'video', codec: 'h264' } as IngestMetadata['streams'][number]];
		});

		const channel = describeChannel(data);

		expect(channel.metadata).toEqual({ name: 'Livestream', description: 'From the roof', license: 'CC BY 4.0' });
		expect(channel.sources).toHaveLength(1);
		expect(channel.sources[0]?.streams).toEqual(data.streams);
	});
});
