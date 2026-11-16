// Ported from legacy/src/views/Publication/Services/DASH.js
import urlparser from 'url-parse';
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	username: string;
	password: string;
	options: {
		seg_duration: string;
		frag_duration: string;
		frag_type: string;
		window_size: string;
		extra_window_size: string;
		remove_at_exit: boolean;
		use_template: boolean;
		use_timeline: boolean;
		single_file: boolean;
		single_file_name: string;
		init_seg_name: string;
		media_seg_name: string;
		utc_timing_url: string;
		method: string;
		http_user_agent: string;
		http_persistent: boolean;
		hls_playlist: boolean;
		streaming: boolean;
		adaptation_sets: string;
		timeout: string;
		index_correction: boolean;
		format_options: string;
		global_sidx: string;
		dash_segment_type: string;
		ignore_io_errors: boolean;
		lhls: boolean;
		ldash: boolean;
		write_prft: string;
		mpd_profile: string;
		http_opts: string;
		target_latency: string;
		min_playback_rate: string;
		max_playback_rate: string;
		update_period: string;
	} & Record<string, any>;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'https://',
		address: '',
		username: '',
		password: '',
		options: {},
		...settings,
	};
	initSettings.options = {
		seg_duration: '2',
		frag_duration: '',
		frag_type: '',
		window_size: '6',
		extra_window_size: '',
		remove_at_exit: false,
		use_template: true,
		use_timeline: true,
		single_file: false,
		single_file_name: '',
		init_seg_name: 'init-stream$RepresentationID$.$ext$',
		media_seg_name: 'chunk-stream$RepresentationID$-$Number%05d$.$ext$',
		utc_timing_url: '',
		method: 'PUT',
		http_user_agent: '',
		http_persistent: false,
		hls_playlist: false,
		streaming: true,
		adaptation_sets: 'id=0,streams=v id=1,streams=a',
		timeout: '',
		index_correction: true,
		format_options: '',
		global_sidx: '',
		dash_segment_type: 'auto',
		ignore_io_errors: false,
		lhls: false,
		ldash: false,
		write_prft: '',
		mpd_profile: '',
		http_opts: '',
		target_latency: '',
		min_playback_rate: '',
		max_playback_rate: '',
		update_period: '',
		...initSettings.options,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options: (string | number)[] = ['-strict', 'experimental', '-f', 'dash'];
	for (let key in settings.options) {
		if (settings.options[key].length === 0) {
			continue;
		}
		if (typeof settings.options[key] === 'boolean') {
			options.push('-' + key, Number(settings.options[key]));
		} else {
			options.push('-' + key, String(settings.options[key]));
		}
	}
	let address = settings.protocol + settings.address;
	if (settings.username.length !== 0 || settings.password.length !== 0) {
		const url = urlparser(address);
		if (settings.username.length !== 0) {
			url.set('username', encodeURIComponent(settings.username));
		}
		if (settings.password.length !== 0) {
			url.set('password', encodeURIComponent(settings.password));
		}
		address = url.toString();
	}
	const output = {
		address: address,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'dash',
	name: 'DASH',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['http', 'https'], formats: ['dash'], codecs: { audio: ['none'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source as MPEG-DASH to an HTTP/S Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'http://ffmpeg.org/ffmpeg-all.html#dash' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#dash',
	icon: { type: 'fontawesome-solid', name: 'faTools', color: 'rgba(57, 181, 74, 1)' },
	init,
	createOutput,
	fields: [
		{
			key: 'protocol',
			type: 'select',
			label: 'Protocol',
			options: [
				{ value: 'http://', label: 'http://' },
				{ value: 'https://', label: 'https://' },
			],
		},
		{ key: 'address', type: 'text', label: 'Address' },
		{ key: 'username', type: 'text', label: 'Username' },
		{ key: 'password', type: 'password', label: 'Password' },
		{ key: 'options.http_user_agent', type: 'text', label: 'http_user_agent', advanced: true, section: 'General' },
		{
			key: 'options.method',
			type: 'select',
			label: 'method',
			options: [
				{ value: 'PUT', label: 'PUT' },
				{ value: 'POST', label: 'POST' },
			],
			advanced: true,
			section: 'General',
		},
		{ key: 'options.http_opts', type: 'text', label: 'http_opts', advanced: true, section: 'General' },
		{ key: 'options.timeout', type: 'number', label: 'timeout', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'options.target_latency', type: 'number', label: 'target_latency', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'options.min_playback_rate', type: 'number', label: 'min_playback_rate', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'options.max_playback_rate', type: 'number', label: 'max_playback_rate', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'options.update_period', type: 'number', label: 'update_period', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'options.http_persistent', type: 'checkbox', label: 'http_persistent', advanced: true, section: 'General' },
		{ key: 'options.streaming', type: 'checkbox', label: 'streaming', advanced: true, section: 'General' },
		{ key: 'options.ignore_io_errors', type: 'checkbox', label: 'ignore_io_errors', advanced: true, section: 'General' },
		{ key: 'options.lhls', type: 'checkbox', label: 'lhls', advanced: true, section: 'General' },
		{ key: 'options.ldash', type: 'checkbox', label: 'ldash', advanced: true, section: 'General' },
		{ key: 'options.seg_duration', type: 'number', label: 'seg_duration', min: '0', step: '1', advanced: true, section: 'Chunk' },
		{ key: 'options.frag_duration', type: 'number', label: 'frag_duration', min: '0', step: '1', advanced: true, section: 'Chunk' },
		{ key: 'options.frag_type', type: 'text', label: 'frag_type', advanced: true, section: 'Chunk' },
		{ key: 'options.window_size', type: 'number', label: 'window_size', min: '0', step: '1', advanced: true, section: 'Playlist' },
		{ key: 'options.extra_window_size', type: 'number', label: 'extra_window_size', min: '0', step: '1', advanced: true, section: 'Playlist' },
		{ key: 'options.adaptation_sets', type: 'text', label: 'adaptation_sets', advanced: true, section: 'Playlist' },
		{ key: 'options.format_options', type: 'text', label: 'format_options', advanced: true, section: 'Playlist' },
		{
			key: 'options.global_sidx',
			type: 'text',
			label: 'global_sidx',
			showIf: (settings) => !!!settings.options.streaming,
			advanced: true,
			section: 'Playlist',
		},
		{ key: 'options.mpd_profile', type: 'text', label: 'mpd_profile', advanced: true, section: 'Playlist' },
		{
			key: 'options.single_file',
			type: 'checkbox',
			label: 'single_file',
			showIf: (settings) => !!!settings.options.streaming,
			advanced: true,
			section: 'Playlist',
		},
		{ key: 'options.remove_at_exit', type: 'checkbox', label: 'remove_at_exit', advanced: true, section: 'Playlist' },
		{ key: 'options.use_template', type: 'checkbox', label: 'use_template', advanced: true, section: 'Playlist' },
		{ key: 'options.use_timeline', type: 'checkbox', label: 'use_timeline', advanced: true, section: 'Playlist' },
		{ key: 'options.index_correction', type: 'checkbox', label: 'index_correction', advanced: true, section: 'Playlist' },
		{ key: 'options.hls_playlist', type: 'checkbox', label: 'hls_playlist', advanced: true, section: 'Playlist' },
		{
			key: 'options.dash_segment_type',
			type: 'select',
			label: 'dash_segment_type',
			options: [
				{ value: 'auto', label: 'auto' },
				{ value: 'mp4', label: 'mp4' },
				{ value: 'webm', label: 'webm' },
			],
			advanced: true,
			section: 'Segmentation',
		},
		{ key: 'options.init_seg_name', type: 'text', label: 'init_seg_name', advanced: true, section: 'Segmentation' },
		{ key: 'options.media_seg_name', type: 'text', label: 'media_seg_name', advanced: true, section: 'Segmentation' },
		{
			key: 'options.single_file_name',
			type: 'text',
			label: 'single_file_name',
			showIf: (settings) => !!settings.options.single_file,
			advanced: true,
			section: 'Segmentation',
		},
		{ key: 'options.utc_timing_url', type: 'text', label: 'utc_timing_url', advanced: true, section: 'Segmentation' },
		{ key: 'options.write_prft', type: 'text', label: 'write_prft', advanced: true, section: 'Segmentation' },
	],
};

export default service;
