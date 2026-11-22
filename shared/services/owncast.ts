// Ported from legacy/src/views/Publication/Services/Owncast.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	server_url: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		server_url: '',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: settings.protocol + settings.server_url + '/' + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'owncast',
	name: 'Owncast',
	version: '1.0',
	stream_key_link: '',
	category: 'software',
	requires: { protocols: ['rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit your Livestream to an Owncast server. Here you can find more details about the settings.',
	description_links: [{ text: 'Here ', href: 'https://owncast.online/quickstart/startstreaming/' }],
	image_copyright: 'Please get in touch with the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/owncast.svg', alt: 'Owncast Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'protocol', type: 'url', label: 'Protocol', disabled: true },
		{ key: 'server_url', type: 'text', label: 'Server URL', placeholder: 'yourserver/live' },
		{ key: 'stream_key', type: 'text', label: 'Stream key', placeholder: 'abc123' },
	],
};

export default service;
