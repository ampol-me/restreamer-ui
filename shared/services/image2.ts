// Ported from legacy/src/views/Publication/Services/Image2.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	options: {
		frame_pts: boolean;
		start_number: string;
		update: boolean;
		strftime: boolean;
		method: string;
	} & Record<string, any>;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'https://',
		address: '',
		options: {},
		...settings,
	};
	initSettings.options = {
		frame_pts: false,
		start_number: '1',
		update: true,
		strftime: false,
		method: 'PUT',
		...initSettings.options,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options = ['-f', 'image2'];
	for (let key in settings.options) {
		if (settings.options[key].length === 0) {
			continue;
		}
		options.push('-' + key, String(settings.options[key]));
	}
	const output = {
		address: settings.protocol + settings.address,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'image2',
	name: 'Image2',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['http', 'https'], formats: ['image2'], codecs: { audio: ['none'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit snapshots of the main source to an HTTP/S Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://ffmpeg.org/ffmpeg-all.html#image2' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#image2',
	icon: { type: 'fontawesome-solid', name: 'faImages', color: '#39B54A' },
	init,
	createOutput,
	fields: [
		{
			key: 'protocol',
			type: 'select',
			label: 'Protocol',
			options: [
				{ value: 'http://', label: 'http://' },
				{ value: 'https://', label: 'https://' },
			],
		},
		{ key: 'address', type: 'text', label: 'Address' },
		{ key: 'options.start_number', type: 'number', label: 'start_number', min: '1', step: '1', advanced: true, section: 'General' },
		{
			key: 'options.method',
			type: 'select',
			label: 'method',
			options: [
				{ value: '', label: 'default' },
				{ value: 'PUT', label: 'PUT' },
				{ value: 'POST', label: 'POST' },
			],
			advanced: true,
			section: 'General',
		},
		{ key: 'options.frame_pts', type: 'checkbox', label: 'frame_pts', advanced: true, section: 'General' },
		{ key: 'options.update', type: 'checkbox', label: 'update', advanced: true, section: 'General' },
		{ key: 'options.strftime', type: 'checkbox', label: 'strftime', advanced: true, section: 'General' },
	],
};

export default service;
