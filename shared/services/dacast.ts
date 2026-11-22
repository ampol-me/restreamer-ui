// Ported from legacy/src/views/Publication/Services/DaCast.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	server: string;
	backup_server: string;
	enable_backup_server: boolean;
	username: string;
	password: string;
	stream_key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		server: '',
		backup_server: '',
		enable_backup_server: false,
		username: '',
		password: '',
		stream_key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const outputs = [];
	const options = ['-f', 'flv'];
	const output_0 = {
		address: settings.protocol + settings.username + ':' + settings.password + '@' + settings.server + '/' + settings.stream_key,
		options: options,
	};
	outputs.push(output_0);
	if (settings.enable_backup_server) {
		const output_1 = {
			address: settings.protocol + settings.username + ':' + settings.password + '@' + settings.server + '/' + settings.stream_key,
			options: options,
		};
		outputs.push(output_1);
	}
	return outputs;
}

const service: Service<Settings> = {
	id: 'dacast',
	name: 'DaCast',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an DaCast RTMP Service. More about the setup here.',
	description_links: [{ text: 'here', href: 'https://www.dacast.com/support/knowledgebase/intro-to-live-streaming-a-step-by-step-walkthrough/' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/dacast.svg', alt: 'DaCast Logo' },
	init,
	createOutput,
	fields: [
		{
			key: 'protocol',
			type: 'select',
			label: 'Protocol',
			options: [
				{ value: 'rtmp://', label: 'rtmp://' },
				{ value: 'rtmps://', label: 'rtmps://' },
			],
		},
		{ key: 'server', type: 'url', label: 'Server', required: true },
		{ key: 'username', type: 'url', label: 'Username', required: true },
		{ key: 'password', type: 'url', label: 'Password', required: true },
		{ key: 'stream_key', type: 'url', label: 'Stream key', required: true },
		{ key: 'enable_backup_server', type: 'checkbox', label: 'Enable Backup Server' },
		{ key: 'protocol', type: 'url', label: 'Protocol', disabled: true, showIf: (settings) => !!settings.enable_backup_server },
		{ key: 'backup_server', type: 'url', label: 'Backup server', showIf: (settings) => !!settings.enable_backup_server },
	],
};

export default service;
