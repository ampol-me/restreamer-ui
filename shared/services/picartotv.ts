// Ported from legacy/src/views/Publication/Services/PicartoTv.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	region: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		region: 'live.us',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: 'rtmp://' + settings.region + '.picarto.tv/golive/' + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'picartotv',
	name: 'Picarto TV',
	version: '1.0',
	stream_key_link: 'https://picarto.tv',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to the Picarto TV RTMP Service. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://help.picarto.tv/help/' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/picarto-tv.svg', alt: 'Picarto TV Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'region',
			type: 'select',
			label: 'Region',
			options: [
				{ value: 'live.us', label: 'Autodetect' },
				{ value: 'live.us-losangeles', label: 'Los Angeles, USA' },
				{ value: 'live.us-dalla', label: 'Dallas, USA' },
				{ value: 'live.us-miami', label: 'Miami, USA' },
				{ value: 'live.us-newyork', label: 'New York, USA' },
				{ value: 'live.eu-west1', label: 'Europe' },
			],
		},
		{ key: 'stream_key', type: 'text', label: 'Stream key' },
	],
};

export default service;
