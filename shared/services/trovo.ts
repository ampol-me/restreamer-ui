// Ported from legacy/src/views/Publication/Services/Trovo.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: 'rtmp://livepush.trovo.live/live/' + settings.key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'trovo',
	name: 'Trovo',
	version: '1.0',
	stream_key_link: 'https://studio.trovo.live/mychannel/stream',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Live-Streaming to Trovo Live RTMP Service.',
	image_copyright: '',
	icon: { type: 'svg', name: 'logos/trovo.svg', alt: 'Trovo Logo' },
	init,
	createOutput,
	fields: [{ key: 'key', type: 'text', label: 'Stream key', link: { label: 'GET', href: 'https://studio.trovo.live/mychannel/stream' } }],
};

export default service;
