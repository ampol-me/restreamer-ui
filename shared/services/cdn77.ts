// Ported from legacy/src/views/Publication/Services/CDN77.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	stream_url: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		stream_url: '',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options = ['-f', 'flv'];
	const output = {
		address: settings.protocol + settings.stream_url + settings.stream_key,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'cdn77',
	name: 'CDN77',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an CDN77 RTMP Service. More about the setup here.',
	description_links: [{ text: 'here', href: 'https://client.cdn77.com/support/knowledgebase/streaming/ls_general_setup' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/cdn77.svg', alt: 'DaCast Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'protocol', type: 'url', label: 'Protocol', disabled: true },
		{ key: 'stream_url', type: 'url', label: 'Stream URL', required: true },
		{ key: 'stream_key', type: 'url', label: 'Stream key', required: true },
	],
};

export default service;
