// Ported from legacy/src/views/Publication/Services/Wettercom.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	server_url: string;
	stream_id: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		server_url: 'wettercom-c1.livespotting.com/c61cba4f-68a3-488e-b2e4-ffb8e182794f',
		stream_id: '',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: settings.protocol + settings.server_url + '/' + settings.stream_id + '.stream/' + settings.stream_id + '_token:' + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'wettercom',
	name: 'wetter.com',
	version: '1.0',
	stream_key_link: 'https://www.wetter.com/hd-live-webcams/informationen/',
	category: 'software',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit your Livestream to wetter.com. Contact the publisher  here .',
	description_links: [{ text: 'here ', href: 'https://www.wetter.com/hd-live-webcams/informationen/' }],
	image_copyright: 'Please get in touch with the operator of the service and check what happens.',
	icon: { type: 'image', name: 'logos/wettercom.png', alt: 'wetter.com Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'stream_id', type: 'text', label: 'Stream ID' },
		{ key: 'stream_key', type: 'text', label: 'Stream key', link: { label: 'GET', href: 'https://www.wetter.com/hd-live-webcams/informationen/' } },
	],
};

export default service;
