// Ported from legacy/src/views/Publication/Services/Facebook.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	stream_key_primary: string;
	stream_key_backup: string;
	rtmp_primary: boolean;
	rtmp_backup: boolean;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		stream_key_primary: '',
		stream_key_backup: '',
		rtmp_primary: true,
		rtmp_backup: false,
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const outputs = [];
	const output_primary = {
		address: 'rtmps://live-api-s.facebook.com:443/rtmp/' + settings.stream_key_primary,
		options: ['-f', 'flv'],
	};
	const output_backup = {
		address: 'rtmps://live-api-s.facebook.com:443/rtmp/' + settings.stream_key_backup,
		options: ['-f', 'flv'],
	};
	if (settings.stream_key_primary.length !== 0) {
		if (settings.rtmp_primary) {
			outputs.push(output_primary);
		}
	}
	if (settings.stream_key_backup.length !== 0) {
		if (settings.rtmp_backup) {
			outputs.push(output_backup);
		}
	}
	return outputs;
}

const service: Service<Settings> = {
	id: 'facebook',
	name: 'Facebook Live',
	version: '1.0',
	stream_key_link: 'https://www.facebook.com/live/producer?ref=datarhei/restreamer',
	category: 'platform',
	requires: { protocols: ['rtmps'], formats: ['flv'], codecs: { audio: ['aac'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Live-Streaming to Facebook Live RTMP service',
	image_copyright: 'More about licenses here',
	icon: { type: 'fontawesome-brand', name: 'faFacebook', color: '#2D88FF' },
	init,
	createOutput,
	fields: [
		{
			key: 'stream_key_primary',
			type: 'text',
			label: 'Primary stream key',
			showIf: (settings) => settings.rtmp_primary === true,
			link: { label: 'GET', href: 'https://www.facebook.com/live/producer?ref=datarhei/restreamer' },
		},
		{
			key: 'stream_key_backup',
			type: 'text',
			label: 'Backup stream key',
			showIf: (settings) => settings.rtmp_backup === true,
			link: { label: 'GET', href: 'https://www.facebook.com/live/producer?ref=datarhei/restreamer' },
		},
		{ key: 'rtmp_primary', type: 'checkbox', label: 'Enable primary stream' },
		{ key: 'rtmp_backup', type: 'checkbox', label: 'Enable backup stream' },
	],
};

export default service;
