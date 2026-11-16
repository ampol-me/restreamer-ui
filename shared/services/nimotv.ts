// Ported from legacy/src/views/Publication/Services/NimoTv.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	lines: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		lines: '1',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): (ServiceOutput | null)[] {
	if (!settings.stream_key) {
		return [null];
	}
	let address = 'rtmp://txpush.rtmp.nimo.tv/live/';
	if (settings.lines === '2') {
		address = 'rtmp://162.62.215.16/txpush.rtmp.nimo.tv/live/';
	}
	const output = {
		address: address + settings.stream_key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'nimotv',
	name: 'Nimo TV',
	version: '1.0',
	stream_key_link: 'https://dashboard.nimo.tv/i/stream-url',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to the Nimo TV RTMP Service. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://help.nimo.tv/help/' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/nimo-tv.svg', alt: 'Nimo TV Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'lines',
			type: 'select',
			label: 'Lines',
			options: [
				{ value: '1', label: 'Line 1' },
				{ value: '2', label: 'Line 2' },
			],
		},
		{ key: 'stream_key', type: 'text', label: 'Stream key', link: { label: 'GET', href: 'https://dashboard.nimo.tv/i/stream-url' } },
	],
};

export default service;
