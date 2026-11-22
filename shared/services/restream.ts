// Ported from legacy/src/views/Publication/Services/Restream.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	region: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		region: 'live',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: 'rtmp://' + settings.region + '.restream.io/live/' + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'restream',
	name: 'Restream',
	version: '1.0',
	stream_key_link: 'https://restream.io/settings/streaming-setup?from=datarhei/restreamer',
	category: 'platform',
	requires: { protocols: ['rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to the Restream RTMP Service. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://restream.io' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/restream.svg', alt: 'restream.io Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'region',
			type: 'select',
			label: 'Region',
			options: [
				{ value: 'live', label: 'Autodetect' },
				{ value: 'london', label: 'EU-West - London, GB' },
				{ value: 'amsterdam', label: 'EU-West - Amsterdam, NL' },
				{ value: 'luxembourg', label: 'EU-West - Luxembourg' },
				{ value: 'paris', label: 'EU-West - Paris, FR' },
				{ value: 'milan', label: 'EU-West - Milan, IT' },
				{ value: 'frankfurt', label: 'EU-Central - Frankfurt, DE' },
				{ value: 'falkenstein', label: 'EU-East - Falkenstein, DE' },
				{ value: 'prague', label: 'EU-East - Prague, Czech' },
				{ value: 'madrid', label: 'EU-South - Madrid, Spain' },
				{ value: 'moscow', label: 'Russia - Moscow' },
				{ value: 'istanbul', label: 'Turkey - Istanbul' },
				{ value: 'telaviv', label: 'Israel - Tel Aviv' },
				{ value: 'seattle', label: 'US-West - Seattle, WA' },
				{ value: 'sanjose', label: 'US-West - San Jose, CA' },
				{ value: 'dallas', label: 'US-Central - Dallas, TX' },
				{ value: 'washington', label: 'US-East - Washington, DC' },
				{ value: 'miami.restream.io/live', label: 'US-East - Miami, FL' },
				{ value: 'chicago', label: 'US-East - Chicago, IL' },
				{ value: 'toronto', label: 'NA-East - Toronto, Canada' },
				{ value: 'saopaulo', label: 'SA - Saint Paul, Brazil' },
				{ value: 'bangalore', label: 'India - Bangalore' },
				{ value: 'singapore', label: 'Asia - Singapore' },
				{ value: 'seoul', label: 'Asia - Seoul, South Korea' },
				{ value: 'tokyo', label: 'Asia - Tokyo, Japan' },
				{ value: 'sydney', label: 'Australia - Sydney' },
			],
		},
		{
			key: 'stream_key',
			type: 'text',
			label: 'Stream key',
			link: { label: 'GET', href: 'https://restream.io/settings/streaming-setup?from=datarhei/restreamer' },
		},
	],
};

export default service;
