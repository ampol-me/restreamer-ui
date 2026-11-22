// Ported from legacy/src/views/Publication/Services/Core.js
import urlparser from 'url-parse';
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	v2_address: string;
	v2_protocol: string;
	v2_host: string;
	v2_stream_id: string;
	v2_token: string;
	v2_passphrase: string;
	// v1.0 settings, emptied by init() after the migration to v2.0
	protocol?: string;
	base_url?: string;
	app_path?: string;
	stream_name?: string;
	token?: string;
	srt_passphrase?: string;
}

// Legacy has no stream_key_link for this service but these two (unused in the legacy form).
export const stream_key_link_rtmp = 'https://docs.datarhei.com/restreamer/knowledge-base/manual/system-settings/rtmp';
export const stream_key_link_srt = 'https://docs.datarhei.com/restreamer/knowledge-base/manual/system-settings/srt';

function init(settings: Record<string, any> = {}): Settings {
	// v1.0 > v2.0
	if (settings.base_url && !settings.v2_protocol) {
		if (settings.base_url.length !== 0) {
			settings.v2_protocol = settings.protocol;
			settings.v2_host = settings.base_url;
			if (settings.protocol === 'srt') {
				settings.v2_address =
					`srt://${settings.base_url}?mode=caller&transtype=live&streamid=#!:m=publish,r=${settings.stream_name}` +
					(settings.token.length !== 0 ? `,token=${settings.token}` : '') +
					(settings.srt_passphrase.length !== 0 ? `&passphrase=${settings.srt_passphrase}` : '');
				settings.v2_stream_id = `#!:m=publish,r=${settings.stream_name}` + (settings.token.length !== 0 ? `,token=${settings.token}` : '');
				settings.v2_passphrase = settings.srt_passphrase;
			} else {
				settings.v2_address =
					`${settings.protocol}://${settings.base_url}/` +
					(settings.app_path.length !== 0 ? `${settings.app_path}/` : '') +
					settings.stream_name +
					(settings.token.length !== 0 ? `?token=${settings.token}` : '');
				settings.v2_stream_id = `/` + (settings.app_path.length !== 0 ? `${settings.app_path}/` : '') + settings.stream_name;
				settings.v2_token = settings.token;
			}
		}
		settings.base_url = '';
		settings.app_path = '';
		settings.stream_name = '';
		settings.token = '';
		settings.srt_passphrase = '';
	}
	const initSettings = {
		v2_address: '',
		v2_protocol: '',
		v2_host: '',
		v2_stream_id: '',
		v2_token: '',
		v2_passphrase: '',
		...settings,
	};
	return initSettings as Settings;
}

// Legacy handleChange: every change (there's only the 'v2_address' field) stores the value and then derives
// v2_protocol/v2_host/v2_stream_id/v2_token/v2_passphrase from the pasted URL. These derived settings are only
// displayed (see the 'info' fields), createOutput() only uses v2_address.
function handleChange(settings: Settings, key: string, value: string, _ctx: ServiceContext): Settings {
	const s = settings as Record<string, any>;
	s[key] = value;
	const url = urlparser(value);
	if (url.protocol === 'rtmp:' || url.protocol === 'rtmps:' || url.protocol === 'srt:') {
		s.v2_protocol = url.protocol.split(':')[0];
		s.v2_host = url.host;
		if (url.protocol === 'srt:') {
			if (url.hash) {
				if (url.hash.includes('passphrase=')) {
					s.v2_stream_id = url.hash.split('&')[0];
					s.v2_passphrase = url.hash.split('&passphrase=')[1]!.split('&')[0];
				} else {
					s.v2_stream_id = url.hash.split('&')[0];
					s.v2_passphrase = '';
				}
			} else if (url.query) {
				if (url.query.includes('passphrase=')) {
					s.v2_stream_id = url.query.split('streamid=')[1]!.split('&')[0];
					s.v2_passphrase = url.query.split('&passphrase=')[1]!.split('&')[0];
				} else {
					s.v2_stream_id = url.query.split('streamid=')[1];
					s.v2_passphrase = '';
				}
			} else {
				s.v2_stream_id = '';
				s.v2_passphrase = '';
			}
		} else {
			s.v2_stream_id = url.pathname;
			if (url.query) {
				if (url.query.includes('token=')) {
					s.v2_token = url.query.split('token=')[1]!.split('&')[0];
				} else if (url.query.includes('token:')) {
					s.v2_token = url.query.split('token:')[1]!.split('&')[0];
				} else {
					s.v2_token = '';
				}
			} else {
				s.v2_token = '';
			}
		}
	} else {
		s.v2_protocol = '';
		s.v2_host = '';
		s.v2_port = '';
		s.v2_streamid = '';
		s.v2_token = '';
		s.v2_passphrase = '';
	}
	return settings;
}

function createOutput(settings: Settings, ctx: ServiceContext): ServiceOutput[] {
	const output: { address: string | null; options: string[] | null } = {
		address: null,
		options: null,
	};
	output.address = settings.v2_address;
	if (settings.v2_address.includes('srt://')) {
		output.options = ['-bsf:v', 'dump_extra', '-f', 'mpegts'];
	} else {
		output.options = ['-f', 'flv'];
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
				output.options.push('-rtmp_enhanced_codecs', codecs.join(','));
			}
		}
	}
	return [output as ServiceOutput];
}

const service: Service<Settings> = {
	id: 'datarheicore',
	name: 'datarhei Core',
	version: '2.0',
	stream_key_link: '',
	category: 'software',
	requires: { protocols: ['rtmp', 'rtmps', 'srt'], formats: ['flv', 'mpegts'], codecs: { audio: ['aac'], video: ['h264', 'hevc', 'vp9', 'av1'] } },
	author: { creator: { name: 'datarhei.com', link: 'https://datarhei.com' }, maintainer: { name: 'datarhei.com', link: 'https://datarhei.com' } },
	description: 'Transmit the main source to an datarhei Core Ressource. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://docs.datarhei.com/restreamer' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	icon: { type: 'svg', name: 'logos/datarhei.svg', alt: 'datarhei.com Logo' },
	init,
	createOutput,
	handleChange,
	fields: [
		{ key: 'v2_address', type: 'text', label: 'Target address' },
		// Legacy renders a box below the address: instructions while it is empty, otherwise the values parsed by handleChange().
		{
			key: 'v2_address',
			type: 'info',
			label: 'Restreamer instructions',
			help: '1. Switch to the interface of the target Restreamer.\n2. Create a new channel and select RTMP or SRT server.\n3. Copy the URL and paste it in the "Target address" field.',
			showIf: (settings) => !settings.v2_address,
		},
		{ key: 'v2_protocol', type: 'info', label: 'Protocol', showIf: (settings) => !!settings.v2_address },
		{ key: 'v2_host', type: 'info', label: 'Address', showIf: (settings) => !!settings.v2_address },
		{ key: 'v2_stream_id', type: 'info', label: 'Stream ID', showIf: (settings) => !!settings.v2_address },
		{ key: 'v2_token', type: 'info', label: 'Token', showIf: (settings) => !!(settings.v2_address && settings.v2_token) },
		{ key: 'v2_passphrase', type: 'info', label: 'Passphrase', showIf: (settings) => !!(settings.v2_address && settings.v2_passphrase) },
	],
};

export default service;
