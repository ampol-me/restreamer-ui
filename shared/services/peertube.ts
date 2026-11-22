// Ported from legacy/src/views/Publication/Services/PeerTube.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	rtmps: boolean;
	domain: string;
	key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		rtmps: false,
		domain: '',
		key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const output = {
		address: `${settings.rtmps ? 'rtmps' : 'rtmp'}://${settings.domain}:${settings.rtmps ? '1936' : '1935'}/live/${settings.key}`,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'peertube',
	name: 'PeerTube',
	version: '1.0',
	stream_key_link: '/videos/upload#go-live',
	category: 'platform',
	requires: { protocols: ['rtmp', 'rtmps'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Live-Streaming to PeerTube v3+ RTMP/S Service.',
	image_copyright: '',
	icon: { type: 'svg', name: 'logos/peertube.svg', alt: 'PeerTube Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'domain', type: 'text', label: 'Instance domain', placeholder: 'joinpeertube.org' },
		{
			key: 'key',
			type: 'text',
			label: 'Stream key',
			link: { label: 'GET', href: (settings) => `https://${settings.domain}/videos/upload#go-live`, disabled: (settings) => settings.domain === '' },
		},
		{ key: 'rtmps', type: 'checkbox', label: 'Enable RTMPS transfer' },
	],
};

export default service;
