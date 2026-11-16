// Ported from legacy/src/views/Publication/Services/RTMP.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	options: {
		rtmp_app: string;
		rtmp_playpath: string;
		rtmp_pageurl: string;
		rtmp_tcurl: string;
		rtmp_conn: string;
		rtmp_flashver: string;
		rtmp_flush_interval: string;
		rtmp_swfhash: string;
		rtmp_swfsize: string;
	} & Record<string, any>;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		address: '',
		options: {},
		...settings,
	};
	initSettings.options = {
		rtmp_app: '',
		rtmp_playpath: '',
		rtmp_pageurl: '',
		rtmp_tcurl: '',
		rtmp_conn: '',
		rtmp_flashver: 'FMLE/3.0',
		rtmp_flush_interval: '10',
		rtmp_swfhash: '',
		rtmp_swfsize: '',
		...initSettings.options,
	};
	return initSettings as Settings;
}

// Legacy handleChange: option fields are assigned as is. For 'address', a leading "rtmpX://" (regex /(rtmp.):\/\// as in
// legacy) is moved into settings.protocol if skills.protocols includes the matched protocol name.
// `key` is the legacy bare name ('address', 'rtmp_app', ...) or the dotted field key ('options.rtmp_app').
function handleChange(settings: Settings, key: string, value: string, ctx: ServiceContext): Settings {
	const what = key.startsWith('options.') ? key.slice('options.'.length) : key;
	if (what in settings.options) {
		settings.options[what] = value;
	} else {
		if (what === 'address') {
			const matches = value.match(/(rtmp.):\/\//);
			if (matches !== null) {
				if (ctx.skills.protocols.includes(matches[1])) {
					settings['protocol'] = matches[0];
					value = value.replace(matches[0], '');
				}
			}
		}
		(settings as Record<string, any>)[what] = value;
	}
	return settings;
}

function createOutput(settings: Settings, ctx: ServiceContext): ServiceOutput[] {
	const options = ['-f', 'flv'];
	if (ctx.skills.ffmpeg.version_major >= 6) {
		const codecs = [];
		if (ctx.skills.codecs.video.includes('hevc')) {
			codecs.push('hvc1');
		}
		if (ctx.skills.codecs.video.includes('av1')) {
			codecs.push('av01');
		}
		if (ctx.skills.codecs.video.includes('vp9')) {
			codecs.push('vp09');
		}
		if (codecs.length !== 0) {
			options.push('-rtmp_enhanced_codecs', codecs.join(','));
		}
	}
	for (let key in settings.options) {
		if (settings.options[key].length !== 0) {
			if (key !== 'rtmp_flush_interval') {
				options.push('-' + key, settings.options[key]);
			} else if (settings.protocol.includes('rtmpt')) {
				options.push('-' + key, settings.options[key]);
			}
		}
	}
	const output = {
		address: settings.protocol + settings.address,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'rtmp',
	name: 'RTMP',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['rtmp', 'rtmps', 'rtmpt', 'rtmpts'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264', 'hevc', 'vp9', 'av1'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an RTMP(e|s|t|te|ts) Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://ffmpeg.org/ffmpeg-all.html#rtmp' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#rtmp',
	icon: { type: 'fontawesome-solid', name: 'faTools', color: '#39B54A' },
	init,
	createOutput,
	handleChange,
	fields: [
		{
			key: 'protocol',
			type: 'select',
			label: 'Protocol',
			options: [
				{ value: 'rtmp://', label: 'rtmp://' },
				{ value: 'rtmpe://', label: 'rtmpe://' },
				{ value: 'rtmps://', label: 'rtmps://' },
				{ value: 'rtmpt://', label: 'rtmpt://' },
				{ value: 'rtmpte://', label: 'rtmpte://' },
				{ value: 'rtmpts://', label: 'rtmpts://' },
			],
		},
		{ key: 'address', type: 'url', label: 'Address' },
		{ key: 'options.rtmp_playpath', type: 'text', label: 'Stream Key' },
		{ key: 'options.rtmp_app', type: 'text', label: 'rtmp_app', advanced: true, section: 'General' },
		{ key: 'options.rtmp_playpath', type: 'text', label: 'rtmp_playpath', advanced: true, section: 'General' },
		{ key: 'options.rtmp_pageurl', type: 'text', label: 'rtmp_pageurl', advanced: true, section: 'General' },
		{ key: 'options.rtmp_tcurl', type: 'text', label: 'rtmp_tcurl', advanced: true, section: 'General' },
		{ key: 'options.rtmp_conn', type: 'text', label: 'rtmp_conn', advanced: true, section: 'General' },
		{ key: 'options.rtmp_flashver', type: 'text', label: 'rtmp_flashver', advanced: true, section: 'General' },
		{
			key: 'options.rtmp_flush_interval',
			type: 'number',
			label: 'rtmp_flush_interval',
			showIf: (settings) => settings.protocol.includes('rtmpt'),
			advanced: true,
			section: 'General',
		},
		{ key: 'options.rtmp_swfhash', type: 'text', label: 'rtmp_swfhash', advanced: true, section: 'Encryption' },
		{ key: 'options.rtmp_swfsize', type: 'number', label: 'rtmp_swfsize', advanced: true, section: 'Encryption' },
	],
};

export default service;
