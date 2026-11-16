// Ported from legacy/src/views/Publication/Services/WOWZA.js
import urlparser from 'url-parse';
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	rtsp_over_udp: boolean;
	username: string;
	password: string;
	address: string;
	application: string;
	stream_name: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		rtsp_over_udp: false,
		username: '',
		password: '',
		address: '',
		application: 'live',
		stream_name: 'myStream',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options = [];
	if (settings.protocol === 'rtsp') {
		if (settings.rtsp_over_udp) {
			options.push('-rtsp_transport', 'tcp');
		}
		options.push('-f', 'rtsp');
	} else {
		options.push('-f', 'flv');
	}
	let address = settings.protocol + settings.address + '/' + settings.application + '/' + settings.stream_name;
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
	id: 'wowza',
	name: 'WOWZA',
	version: '1.0',
	stream_key_link: '',
	category: 'software',
	requires: { protocols: ['rtmp', 'rtp'], formats: ['flv', 'rtsp'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an WOWZA Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://www.wowza.com/docs/how-to-restream-using-ffmpeg-with-wowza-streaming-engine' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/wowza.svg', alt: 'wowza.com Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'protocol',
			type: 'select',
			label: 'Protocol',
			options: [
				{ value: 'rtsp://', label: 'rtsp://' },
				{ value: 'rtmp://', label: 'rtmp://' },
			],
		},
		{ key: 'address', type: 'url', label: 'Address', placeholder: 'wowza-address:port' },
		{ key: 'rtsp_over_udp', type: 'checkbox', label: 'rtsp_over_udp', showIf: (settings) => settings.protocol === 'rtsp://' },
		{ key: 'application', type: 'text', label: 'Application' },
		{ key: 'stream_name', type: 'text', label: 'Stream name' },
		{ key: 'username', type: 'text', label: 'Username' },
		{ key: 'password', type: 'password', label: 'Password' },
	],
};

export default service;
