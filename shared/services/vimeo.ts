// Ported from legacy/src/views/Publication/Services/Vimeo.js
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
		address: 'rtmp://rtmp-global.cloud.vimeo.com/live/' + settings.key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'vimeo',
	name: 'Vimeo',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Live-Streaming to Vimeo Live RTMP Service',
	image_copyright: 'More about licenses here',
	icon: { type: 'fontawesome-brand', name: 'faVimeoV', color: '#00ADEF' },
	init,
	createOutput,
	fields: [{ key: 'key', type: 'text', label: 'Stream key' }],
};

export default service;
