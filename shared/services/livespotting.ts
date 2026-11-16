// Ported from legacy/src/views/Publication/Services/Livespotting.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	base_url: string;
	vpu_id: string;
	livesource_id: string;
	rtmp_token: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		base_url: '-vpu.livespotting.com:1935/live/',
		vpu_id: '',
		livesource_id: '',
		rtmp_token: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options = ['-f', 'flv'];
	const output = {
		address: settings.protocol + settings.vpu_id + settings.base_url + settings.livesource_id + '?token=' + settings.rtmp_token,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'livespotting',
	name: 'livespotting',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp', 'rtmps'], formats: ['flv'], codecs: { audio: ['aac'], video: ['h264'] } },
	author: {
		creator: { name: 'livespotting.com', link: 'https://livespotting.com' },
		maintainer: { name: 'livespotting.com', link: 'https://livespotting.com' },
	},
	description: 'Transmit the main source to an livespotting.com Ressource. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://livespotting.com/products-vpu.html' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/livespotting.svg', alt: 'livespotting.com Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'vpu_id', type: 'text', label: 'VPU ID' },
		{ key: 'livesource_id', type: 'text', label: 'Livesource ID' },
		{ key: 'rtmp_token', type: 'text', label: 'Security token' },
	],
};

export default service;
