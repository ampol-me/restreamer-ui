// Ported from legacy/src/views/Publication/Services/Livepush.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	region: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		region: 'dc-global',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: 'rtmp://' + settings.region + '.livepush.io/live/' + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'livepush',
	name: 'Livepush',
	version: '1.0',
	stream_key_link: 'https://livepush.io',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to the Livepush RTMP Service. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://docs.livepush.io/en/' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/livepush.svg', alt: 'Livepush Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'region',
			type: 'select',
			label: 'Region',
			options: [
				{ value: 'dc-global', label: 'Global' },
				{ value: 'us-central-ch', label: 'Chicago, US' },
				{ value: 'us-east-ny', label: 'New York, US' },
				{ value: 'us-west-la', label: 'Los Angeles, US' },
				{ value: 'us-south-mia', label: 'Miami, US' },
				{ value: 'us-central-dal', label: 'Dallas, US' },
				{ value: 'ca-central-mon', label: 'Montreal, CA' },
				{ value: 'ca-south-tor', label: 'Toronto, CA' },
				{ value: 'au-east-syd', label: 'Sydney, AU' },
				{ value: 'uk-central-ldn', label: 'London, UK' },
				{ value: 'it-north-mln', label: 'Milan, IT' },
				{ value: 'fr-central-par', label: 'Paris, FR' },
				{ value: 'as-southeast-sg', label: 'Singapore' },
				{ value: 'in-south-blr', label: 'Bangalore, IN' },
				{ value: 'tr-north-ist', label: 'Turkiye' },
			],
		},
		{ key: 'stream_key', type: 'text', label: 'Stream key' },
	],
};

export default service;
