// Ported from legacy/src/views/Publication/Services/Telegram.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	stream_url: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmps://',
		stream_url: '',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: settings.protocol + settings.stream_url + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'telegram',
	name: 'Telegram',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit a Livestream to a Telegram Channel.',
	image_copyright: 'Please get in touch with the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/telegram.svg', alt: 'Telegram Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'protocol', type: 'url', label: 'Protocol', disabled: true },
		{ key: 'stream_url', type: 'text', label: 'Server URL', placeholder: 'dc4-1.rtmp.t.me/s/' },
		{ key: 'stream_key', type: 'text', label: 'Stream key', placeholder: '123456:ABCDEF' },
	],
};

export default service;
