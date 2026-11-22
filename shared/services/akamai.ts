// Ported from legacy/src/views/Publication/Services/Akamai.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	stream_url: string;
	backup_url: string;
	address_extensions: {
		flashver: string;
		live: string;
		pubUser: string;
		pubPasswd: string;
		playpath: string;
	} & Record<string, any>;
	enable_backup_stream: boolean;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'rtmp://',
		stream_url: '',
		backup_url: '',
		address_extensions: {},
		enable_backup_stream: false,
		...settings,
	};
	initSettings.address_extensions = {
		flashver: 'FMLE/3.020(compatible;20FMSc/1.0)',
		live: 'true',
		pubUser: '',
		pubPasswd: '',
		playpath: '',
		...initSettings.address_extensions,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const address_extensions = [];
	for (let key in settings.address_extensions) {
		if (settings.address_extensions[key].length === 0) {
			continue;
		}
		address_extensions.push(key + '=' + settings.address_extensions[key]);
	}
	const options = ['-f', 'flv'];
	const output = {
		address: settings.protocol + settings.stream_url + ' ' + address_extensions.join(' '),
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'akamai',
	name: 'Akamai',
	version: '1.0',
	stream_key_link: '',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to the Akamai (MSL) Media Services Live. More details about the MSL Encoder settings can be found on here.',
	description_links: [
		{
			text: 'here',
			href: 'https://learn.akamai.com/en-us/webhelp/media-services-live/media-services-live-encoder-compatibility-testing-and-qualification-guide-v4.0/GUID-620AF7FB-F1D7-4CC5-AC43-F4D56DDC02DB.html',
		},
	],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/akamai.svg', alt: 'Akamai Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'address_extensions.pubUser', type: 'url', label: 'Login' },
		{ key: 'address_extensions.pubPasswd', type: 'url', label: 'Password' },
		{ key: 'protocol', type: 'url', label: 'Protocol', disabled: true },
		{ key: 'stream_url', type: 'url', label: 'Stream URL', placeholder: 'p.ab12345.i.akamaientrypoint.net/EntryPoint' },
		{ key: 'address_extensions.playpath', type: 'url', label: 'Stream names', placeholder: 'abc_%i@12345' },
		{ key: 'enable_backup_stream', type: 'checkbox', label: 'Enable backup URL' },
		{ key: 'protocol', type: 'url', label: 'Protocol', disabled: true, showIf: (settings) => !!settings.enable_backup_stream },
		{
			key: 'backup_url',
			type: 'url',
			label: 'Backup URL',
			placeholder: 'b.ab12345.i.akamaientrypoint.net/EntryPoint',
			showIf: (settings) => !!settings.enable_backup_stream,
		},
	],
};

export default service;
