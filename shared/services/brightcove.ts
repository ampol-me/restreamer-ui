// Ported from legacy/src/views/Publication/Services/Brightcove.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	stream_name: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		address: '',
		stream_name: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: settings.protocol + settings.address + settings.stream_name,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'brightcove',
	name: 'Brightcove Live',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to a Brightcove Live Service. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://live.support.brightcove.com/get-started/brightcove-live-training-videos.html' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/brightcove.svg', alt: 'brightcove live Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'protocol', type: 'text', label: 'Protocol', disabled: true },
		{ key: 'address', type: 'text', label: 'Address' },
		{ key: 'stream_name', type: 'text', label: 'Stream name' },
	],
};

export default service;
