// Ported from legacy/src/views/Publication/Services/Red5.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	username: string;
	password: string;
	address: string;
	application: string;
	stream_name: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
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
		options.push('-f', 'rtsp');
	} else {
		options.push('-f', 'flv');
	}
	let protocol = '';
	if (settings.username.length !== 0 && settings.password.length !== 0) {
		protocol = settings.protocol + settings.username + ':' + settings.password + '@';
	} else {
		protocol = settings.protocol;
	}
	const output = {
		address: protocol + settings.address + '/' + settings.application + '/' + settings.stream_name,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'red5',
	name: 'Red5',
	version: '1.0',
	stream_key_link: '',
	category: 'software',
	requires: { protocols: ['rtmp', 'rtp'], formats: ['flv', 'rtsp'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an Red5/Pro Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://www.red5pro.com/docs/server/ffmpeg/publishing-live-streams/' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/red5.svg', alt: 'Red5 Logo' },
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
		{ key: 'address', type: 'url', label: 'Address', placeholder: 'red5-address:port' },
		{ key: 'application', type: 'text', label: 'Application' },
		{ key: 'stream_name', type: 'text', label: 'Stream name' },
		{ key: 'username', type: 'text', label: 'Username', placeholder: 'username' },
		{ key: 'password', type: 'text', label: 'Password', placeholder: 'username' },
	],
};

export default service;
