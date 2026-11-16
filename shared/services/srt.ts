// Ported from legacy/src/views/Publication/Services/SRT.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	params: {
		connect_timeout: string;
		ffs: string;
		inputbw: string;
		iptos: string;
		ipttl: string;
		latency: string;
		listen_timeout: string;
		maxbw: string;
		mode: string;
		mss: string;
		nakreport: boolean;
		oheadbw: string;
		payload_size: string;
		send_buffer_size: string;
		timeout: string;
		tlpktdrop: boolean;
		sndbuf: string;
		rcvbuf: string;
		lossmaxttl: string;
		smoother: string;
		streamid: string;
		transtype: string;
		passphrase: string;
		enforced_encryption: boolean;
		kmrefreshrate: string;
		kmpreannounce: string;
		pbkeylen: string;
	} & Record<string, any>;
}

const defaults: Record<string, string | boolean> = {
	connect_timeout: '3000',
	ffs: '25600',
	inputbw: '0',
	iptos: '0xB8',
	ipttl: '64',
	latency: '120000',
	listen_timeout: '0',
	maxbw: '0',
	mode: 'caller',
	mss: '1500',
	nakreport: true,
	oheadbw: '25',
	payload_size: '-1',
	send_buffer_size: '0',
	timeout: '3000000',
	tlpktdrop: true,
	sndbuf: '0',
	rcvbuf: '0',
	lossmaxttl: '0',
	smoother: 'live',
	streamid: '',
	transtype: '',
	passphrase: '',
	enforced_encryption: false,
	kmrefreshrate: '-1',
	kmpreannounce: '-1',
	pbkeylen: '16',
};

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'srt://',
		address: '',
		params: {},
		...settings,
	};
	initSettings.params = {
		...defaults,
		transtype: 'live',
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
		if (settings.params[key] === defaults[key]) {
			continue;
		}
		if (typeof settings.params[key] === 'boolean') {
			params.push(key + '=' + (settings.params[key] ? '1' : '0'));
		} else {
			params.push(key + '=' + settings.params[key]);
		}
	}
	const options = ['-bsf:v', 'dump_extra', '-f', 'mpegts'];
	const output = {
		address: settings.protocol + settings.address + '?' + params.join('&'),
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'srt',
	name: 'SRT',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['srt'], formats: ['mpegts'], codecs: { audio: ['aac', 'mp3'], video: ['h264', 'hevc', 'vp9', 'av1'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an SRT Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://ffmpeg.org/ffmpeg-all.html#srt' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#srt',
	icon: { type: 'fontawesome-solid', name: 'faTools', color: '#39B54A' },
	init,
	createOutput,
	fields: [
		{ key: 'protocol', type: 'text', label: 'Protocol', disabled: true },
		{ key: 'address', type: 'text', label: 'Address' },
		{ key: 'params.streamid', type: 'text', label: 'streamid' },
		{ key: 'params.connect_timeout', type: 'number', label: 'connect_timeout', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.ffs', type: 'number', label: 'ffs', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.inputbw', type: 'number', label: 'inputbw', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.iptos', type: 'text', label: 'iptos', advanced: true, section: 'General' },
		{ key: 'params.ipttl', type: 'number', label: 'ipttl', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.latency', type: 'number', label: 'latency', min: '0', step: '1000', advanced: true, section: 'General' },
		{ key: 'params.maxbw', type: 'number', label: 'maxbw', min: '-1', step: '1', advanced: true, section: 'General' },
		{
			key: 'params.mode',
			type: 'select',
			label: 'mode',
			options: [
				{ value: 'caller', label: 'caller' },
				{ value: 'listener', label: 'listener' },
				{ value: 'rendezvous', label: 'rendezvous' },
			],
			advanced: true,
			section: 'General',
		},
		{ key: 'params.mss', type: 'number', label: 'mss', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.oheadbw', type: 'number', label: 'oheadbw', min: '0', max: '100', step: '1', advanced: true, section: 'General' },
		{ key: 'params.payload_size', type: 'number', label: 'payload_size', min: '-1', step: '1', advanced: true, section: 'General' },
		{ key: 'params.send_buffer_size', type: 'number', label: 'send_buffer_size', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.sndbuf', type: 'number', label: 'sndbuf', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.rcvbuf', type: 'number', label: 'rcvbuf', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'params.lossmaxttl', type: 'number', label: 'lossmaxttl', min: '0', step: '1', advanced: true, section: 'General' },
		{
			key: 'params.smoother',
			type: 'select',
			label: 'smoother',
			options: [
				{ value: 'live', label: 'live' },
				{ value: 'file', label: 'file' },
			],
			advanced: true,
			section: 'General',
		},
		{
			key: 'params.transtype',
			type: 'select',
			label: 'transtype',
			options: [
				{ value: 'live', label: 'live' },
				{ value: 'file', label: 'file' },
			],
			advanced: true,
			section: 'General',
		},
		{ key: 'params.nakreport', type: 'checkbox', label: 'nakreport', advanced: true, section: 'General' },
		{ key: 'params.tlpktdrop', type: 'checkbox', label: 'tlpktdrop', advanced: true, section: 'General' },
		{ key: 'params.passphrase', type: 'text', label: 'passphrase', advanced: true, section: 'Encryption' },
		{ key: 'params.kmrefreshrate', type: 'number', label: 'kmrefreshrate', min: '-1', step: '1', advanced: true, section: 'Encryption' },
		{ key: 'params.kmpreannounce', type: 'number', label: 'kmpreannounce', min: '-1', step: '1', advanced: true, section: 'Encryption' },
		{
			key: 'params.pbkeylen',
			type: 'select',
			label: 'pbkeylen',
			options: [
				{ value: '16', label: '16' },
				{ value: '24', label: '24' },
				{ value: '32', label: '32' },
			],
			advanced: true,
			section: 'Encryption',
		},
		{ key: 'params.enforced_encryption', type: 'checkbox', label: 'enforced_encryption', advanced: true, section: 'Encryption' },
	],
};

export default service;
