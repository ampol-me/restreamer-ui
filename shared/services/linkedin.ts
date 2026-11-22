// Ported from legacy/src/views/Publication/Services/Linkedin.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		address: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: settings.protocol + settings.address,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'linkedin',
	name: 'LinkedIn',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp', 'rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit to LinkedIn. More details can be found here.',
	description_links: [{ text: 'here', href: 'https://www.linkedin.com/help/linkedin/answer/128901/go-live-using-a-custom-stream-rtmp-' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'mui', name: 'LinkedIn', alt: 'linkedin Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'protocol',
			type: 'select',
			label: 'Protocol',
			options: [
				{ value: 'rtmp://', label: 'rtmp://' },
				{ value: 'rtmps://', label: 'rtmps://' },
			],
		},
		{ key: 'address', type: 'text', label: 'Address', placeholder: '{custom_id}.channel.media.azure.net:2935/live/{custom_id}' },
	],
};

export default service;
