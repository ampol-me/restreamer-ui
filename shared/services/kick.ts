// Ported from legacy/src/views/Publication/Services/Kick.js
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
		address: settings.server_url,
		options: ['-rtmp_playpath', settings.stream_key, '-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'kick',
	name: 'Kick',
	version: '1.0',
	stream_key_link: 'https://kick.com/dashboard/settings/stream',
	category: 'platform',
	requires: { protocols: ['rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit your Livestream to an Kick.com RTMP service. Here you can find more details about the settings.',
	description_links: [{ text: 'Here ', href: 'https://help.kick.com/en/articles/7066931-how-to-stream-on-kick-com' }],
	image_copyright: 'Please get in touch with the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/kick.svg', alt: 'Kick.com Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'server_url',
			type: 'text',
			label: 'Server URL',
			placeholder: 'rtmps://your-id.global-contribute.live-video.net',
			help: (settings) => (settings.server_url.includes('rtmps://') ? false : 'Please enter a valid RTMPS URL.'),
		},
		{
			key: 'stream_key',
			type: 'text',
			label: 'Stream key',
			placeholder: 'abc123',
			link: { label: 'GET', href: 'https://kick.com/dashboard/settings/stream' },
		},
	],
};

export default service;
