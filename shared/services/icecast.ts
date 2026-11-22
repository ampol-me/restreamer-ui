// Ported from legacy/src/views/Publication/Services/Icecast.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	options: {
		ice_genre: string;
		ice_name: string;
		ice_description: string;
		ice_url: string;
		ice_public: boolean;
		user_agent: string;
		legacy_icecast: boolean;
		tls: boolean;
	} & Record<string, any>;
}

function init(settings: Record<string, any> = {}, metadata: any = {}): Settings {
	const initSettings = {
		protocol: 'icecast://',
		address: '',
		options: {},
		...settings,
	};
	initSettings.options = {
		ice_genre: '',
		ice_name: metadata.name,
		ice_description: metadata.description,
		ice_url: '',
		ice_public: true,
		user_agent: '',
		legacy_icecast: false,
		tls: false,
		...initSettings.options,
	};
	return initSettings as Settings;
}

function createOutputs(settings: Record<string, any>, skills: any, metadata: any, streams: any[]): ServiceOutput[] {
	settings = init(settings, metadata);
	let hasVideo = false;
	let audioCodec = '';
	for (let i = 0; i < streams.length; i++) {
		if (streams[i].type === 'video') {
			hasVideo = true;
		} else if (streams[i].type === 'audio') {
			audioCodec = streams[i].codec;
		}
	}
	const options = [];
	for (let key in settings.options) {
		if (settings.options[key].length === 0) {
			continue;
		}
		options.push('-' + key, String(settings.options[key]));
	}

	// https://gist.github.com/keiya/c8a5cbd4fe2594ddbb3390d9cf7dcac9#file-readme-md
	// https://wiki.xiph.org/Icecast_Server/Streaming_WebM_to_Icecast_with_FFmpeg

	if (hasVideo === true) {
		options.push('-f', 'webm', '-cluster_size_limit', '2', '-cluster_time_limit', '5100', '-content_type', 'video/webm');
	} else {
		switch (audioCodec) {
			case 'aac':
				options.push('-content_type', 'audio/aac', '-f', 'adts');
				break;
			case 'vorbis':
				options.push('-content_type', 'audio/ogg', '-f', 'ogg');
				break;
			case 'opus':
				options.push('-content_type', 'audio/ogg', '-f', 'opus');
				break;
			case 'mp3':
				options.push('-content_type', 'audio/mpeg', '-f', 'mp3');
				break;
			default:
				break;
		}
	}
	const output = {
		address: settings.protocol + settings.address,
		options: options,
	};
	return [output];
}

function createOutput(settings: Settings, ctx: ServiceContext): ServiceOutput[] {
	return createOutputs(settings, ctx.skills, ctx.metadata, ctx.streams);
}

const service: Service<Settings> = {
	id: 'icecast',
	name: 'Icecast',
	version: '1.0',
	stream_key_link: '',
	category: 'software',
	requires: {
		protocols: ['icecast'],
		formats: ['adts', 'opus', 'mp3', 'ogg', 'webm'],
		codecs: { audio: ['aac', 'opus', 'vorbis', 'mp3'], video: ['none', 'vp9'] },
	},
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the audio channel of the main source to an Icecast Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'https://ffmpeg.org/ffmpeg-all.html#Icecast' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'http://ffmpeg.org/ffmpeg-all.html#Icecast',
	icon: { type: 'svg', name: 'logos/icecast.svg', alt: 'Icecat Logo' },
	init,
	createOutput,
	fields: [
		{ key: 'protocol', type: 'text', label: 'Protocol', disabled: true },
		{ key: 'address', type: 'text', label: 'Address', placeholder: 'username:password@server:port/mountpoint' },
		{ key: 'options.ice_name', type: 'text', label: 'ice_name', disabled: true, advanced: true, section: 'General' },
		{ key: 'options.ice_genre', type: 'text', label: 'ice_genre', advanced: true, section: 'General' },
		{ key: 'options.ice_description', type: 'textarea', label: 'ice_description', disabled: true, rows: 4, advanced: true, section: 'General' },
		{ key: 'options.ice_url', type: 'text', label: 'ice_url', advanced: true, section: 'General' },
		{ key: 'options.user_agent', type: 'text', label: 'user_agent', advanced: true, section: 'General' },
	],
};

export default service;
