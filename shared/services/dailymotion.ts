// Ported from legacy/src/views/Publication/Services/Dailymotion.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	server_url: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		server_url: '',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: settings.server_url,
		options: ['-rtmp_playpath', settings.stream_key, '-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'dailymotion',
	name: 'Dailymotion',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp', 'rtmps'], formats: ['flv'], codecs: { audio: ['aac'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit your Livestream to an Dailymotion RTMP service. Here you can find more details about the settings.',
	description_links: [{ text: 'Here ', href: 'https://faq.dailymotion.com/hc/en-us/articles/115009103088-Create-and-configure-a-live-stream' }],
	image_copyright: 'Please get in touch with the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/dailymotion.svg', alt: 'Dailymotion Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'server_url',
			type: 'text',
			label: 'Stream URL',
			help: (settings) =>
				settings.server_url.includes('rtmp://') || settings.server_url.includes('rtmps://') ? false : 'Please enter a valid RTMP/S URL.',
		},
		{ key: 'stream_key', type: 'text', label: 'Stream key', placeholder: 'abc123' },
	],
};

export default service;
