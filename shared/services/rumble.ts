// Ported from legacy/src/views/Publication/Services/Rumble.js
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
		address: settings.server_url + '/' + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'rumble',
	name: 'Rumble',
	version: '1.0',
	stream_key_link: 'https://rumble.com/account/live-streaming',
	category: 'platform',
	requires: { protocols: ['rtmp', 'rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit your Livestream to an Rumble RTMP service. Here you can find more details about the settings.',
	description_links: [{ text: 'Here ', href: 'https://rumblefaq.groovehq.com/help/search?keyword=rtmp' }],
	image_copyright: 'Please get in touch with the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/rumble.svg', alt: 'Rumble Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'server_url',
			type: 'text',
			label: 'Server URL',
			placeholder: 'rtmp://abc.live.rmbl.ws/slot-1234',
			help: (settings) => (settings.server_url.includes('rtmp://') ? false : 'Please enter a valid RTMP URL.'),
		},
		{
			key: 'stream_key',
			type: 'text',
			label: 'Stream key',
			placeholder: 'abc123',
			link: { label: 'GET', href: 'https://rumble.com/account/live-streaming' },
		},
	],
};

export default service;
