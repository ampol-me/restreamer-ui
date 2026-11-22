// Ported from legacy/src/views/Publication/Services/UDP.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	params: {
		buffer_size: string;
		bitrate: string;
		burst_bits: string;
		localport: string;
		localaddr: string;
		pkt_size: string;
		ttl: string;
		fifo_size: string;
		overrun_nonfatal: boolean;
		broadcast: boolean;
	} & Record<string, any>;
}

// init merges the given settings with the default settings
function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'udp://',
		address: '',
		params: {},
		...settings,
	};
	initSettings.params = {
		buffer_size: '32',
		bitrate: '',
		burst_bits: '',
		localport: '',
		localaddr: '',
		pkt_size: '',
		ttl: '',
		fifo_size: '',
		overrun_nonfatal: false,
		broadcast: false,
		...initSettings.params,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const params = [];
	for (let key in settings.params) {
		if (settings.params[key].length === 0) {
			continue;
		}
		params.push(key + '=' + settings.params[key]);
	}
	const output = {
		address: settings.protocol + settings.address + '?' + params.join('&'),
		options: ['-f', 'mpegts'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'udp',
	name: 'UDP',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['udp'], formats: ['mpegts'], codecs: { audio: ['aac', 'mp3'], video: ['h264', 'hevc', 'vp9', 'av1'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an UDP Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://ffmpeg.org/ffmpeg-all.html#udp' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#udp',
	icon: { type: 'fontawesome-solid', name: 'faTools', color: '#39B54A' },
	init,
	createOutput,
	fields: [
		{ key: 'protocol', type: 'text', label: 'Protocol', disabled: true },
		{ key: 'address', type: 'url', label: 'Address' },
		{ key: 'params.buffer_size', type: 'number', label: 'buffer_size', min: '0', step: '1', advanced: true },
		{ key: 'params.bitrate', type: 'number', label: 'bitrate', min: '0', step: '1', advanced: true },
		{ key: 'params.burst_bits', type: 'number', label: 'burst_bits', min: '0', step: '1', advanced: true },
		{ key: 'params.localaddr', type: 'url', label: 'localaddr', advanced: true },
		{ key: 'params.localport', type: 'number', label: 'localport', min: '0', step: '1', advanced: true },
		{ key: 'params.pkt_size', type: 'number', label: 'pkt_size', min: '0', step: '1', advanced: true },
		{ key: 'params.ttl', type: 'number', label: 'ttl', min: '0', step: '1', advanced: true },
		{ key: 'params.fifo_size', type: 'number', label: 'fifo_size', min: '0', step: '1', advanced: true },
		{ key: 'params.overrun_nonfatal', type: 'checkbox', label: 'overrun_nonfatal', advanced: true },
		{ key: 'params.broadcast', type: 'checkbox', label: 'broadcast', advanced: true },
	],
};

export default service;
