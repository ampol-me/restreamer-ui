// Ported from legacy/src/views/Publication/Services/Instagram.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	key: string;
	service_instafeed: boolean;
	service_yellowduck: boolean;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		key: '',
		service_instafeed: false,
		service_yellowduck: false,
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: 'http://instagram.com:443/rtmp/' + settings.key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'instagram',
	name: 'Instagram',
	version: '1.1',
	stream_key_link: 'https://about.instagram.com/blog/tips-and-tricks/instagram-live-producer',
	category: 'platform',
	requires: { protocols: ['rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Live-Streaming to Instagram Live RTMP Service.',
	image_copyright: '',
	icon: { type: 'fontawesome-brand', name: 'faInstagram', color: '#E1306C' },
	init,
	createOutput,
	fields: [
		{
			key: 'key',
			type: 'text',
			label: 'Stream key',
			placeholder: 'IG-10101942686003993-0-AbyaAF64MLbaxSBJ',
			link: { label: 'GET', href: 'https://about.instagram.com/blog/tips-and-tricks/instagram-live-producer' },
		},
	],
};

export default service;
