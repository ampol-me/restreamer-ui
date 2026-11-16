// Ported from legacy/src/views/Publication/Services/RTSP.js
import urlparser from 'url-parse';
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	username: string;
	password: string;
	options: {
		rtsp_transport: string;
		rtsp_flags: string;
		allowed_media_types: string[];
		reorder_queue_size: string;
		user_agent: string;
		muxdelay: string;
	} & Record<string, any>;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtsp://',
		address: '',
		username: '',
		password: '',
		options: {},
		...settings,
	};
	initSettings.options = {
		rtsp_transport: '',
		rtsp_flags: '',
		allowed_media_types: [],
		reorder_queue_size: '',
		user_agent: '',
		muxdelay: '0.1',
		...initSettings.options,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options = ['-f', 'rtsp'];
	for (let key in settings.options) {
		if (settings.options[key].length !== 0) {
			if (key !== 'user_agent') {
				options.push('-' + key, settings.options[key]);
			} else {
				options.push('-user-agent', settings.options.user_agent);
			}
		}
	}
	let address = settings.protocol + settings.address;
	if (settings.username.length !== 0 || settings.password.length !== 0) {
		const url = urlparser(address);
		if (settings.username.length !== 0) {
			url.set('username', encodeURIComponent(settings.username));
		}
		if (settings.password.length !== 0) {
			url.set('password', encodeURIComponent(settings.password));
		}
		address = url.toString();
	}
	const output = {
		address: address,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'rtsp',
	name: 'RTSP',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['rtp'], formats: ['rtsp'], codecs: { audio: ['aac', 'mp3'], video: ['h264', 'hevc', 'vp9'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an RTSP Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://ffmpeg.org/ffmpeg-all.html#rtsp' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#rtsp',
	icon: { type: 'fontawesome-solid', name: 'faTools', color: '#39B54A' },
	init,
	createOutput,
	// Legacy binds reorder_queue_size and user_agent to settings.<name> for display but its handleChange writes them to
	// settings.options.<name>. The fields here use the options path.
	fields: [
		{ key: 'protocol', type: 'url', label: 'Protocol' },
		{ key: 'address', type: 'url', label: 'Address' },
		{ key: 'username', type: 'text', label: 'Username' },
		{ key: 'password', type: 'password', label: 'Password' },
		{
			key: 'options.rtsp_transport',
			type: 'select',
			label: 'rtsp_transport',
			options: [
				{ value: '', label: 'default' },
				{ value: 'udp', label: 'udp' },
				{ value: 'tcp', label: 'tcp' },
				{ value: 'udp_multicast', label: 'udp_multicast' },
				{ value: 'http', label: 'http' },
			],
			advanced: true,
			section: 'General',
		},
		{
			key: 'options.rtsp_flags',
			type: 'select',
			label: 'rtsp_flags',
			options: [
				{ value: '', label: 'default' },
				{ value: 'prefer_tcp', label: 'prefer_tcp' },
			],
			advanced: true,
			section: 'General',
		},
		{
			key: 'options.allowed_media_types',
			type: 'multiselect',
			label: 'allowed_media_types',
			options: [
				{ value: '', label: 'all media types' },
				{ value: 'video', label: 'video' },
				{ value: 'audio', label: 'audio' },
				{ value: 'data', label: 'data' },
			],
			advanced: true,
			section: 'General',
		},
		{ key: 'options.reorder_queue_size', type: 'text', label: 'reorder_queue_size', advanced: true, section: 'General' },
		{ key: 'options.user_agent', type: 'text', label: 'user-agent', advanced: true, section: 'General' },
		// Legacy also renders a text field labelled 'max_delay' bound to settings.max_delay. That setting
		// doesn't exist in init() and is ignored by createOutput() (the option is 'muxdelay', which has no field), so it is
		// not part of this schema.
	],
};

export default service;
