// Ported from legacy/src/views/Publication/Services/HLS.js
import urlparser from 'url-parse';
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	username: string;
	password: string;
	options: {
		hls_init_time: string;
		hls_time: string;
		hls_list_size: string;
		hls_delete_threshold: string;
		hls_ts_options: string;
		hls_start_number_source: string;
		start_number: string;
		hls_allow_cache: boolean;
		hls_base_url: string;
		hls_segment_filename: string;
		strftime_mkdir: string;
		hls_key_info_file: string;
		hls_enc: boolean;
		hls_enc_key: string;
		hls_enc_key_url: string;
		hls_enc_iv: string;
		hls_segment_type: string;
		hls_fmp4_init_filename: string;
		hls_fmp4_init_resend: string;
		hls_flags: string[];
		hls_playlist_type: string;
		method: string;
		http_user_agent: string;
		var_stream_map: string;
		master_pl_name: string;
		master_pl_publish_rate: string;
		http_persistent: boolean;
		timeout: string;
		ignore_io_errors: boolean;
		headers: string;
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
		hls_init_time: '0',
		hls_time: '2',
		hls_list_size: '5',
		hls_delete_threshold: '1',
		hls_ts_options: '',
		hls_start_number_source: 'generic',
		start_number: '0',
		hls_allow_cache: false,
		hls_base_url: '',
		hls_segment_filename: '',
		strftime_mkdir: '',
		hls_key_info_file: '',
		hls_enc: false,
		hls_enc_key: '',
		hls_enc_key_url: '',
		hls_enc_iv: '',
		hls_segment_type: 'mpegts',
		hls_fmp4_init_filename: 'init.mp4',
		hls_fmp4_init_resend: '0',
		hls_flags: [],
		hls_playlist_type: '',
		method: 'PUT',
		http_user_agent: '',
		var_stream_map: '',
		master_pl_name: '',
		master_pl_publish_rate: '',
		http_persistent: false,
		timeout: '',
		ignore_io_errors: false,
		headers: '',
		...initSettings.options,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options = ['-f', 'hls'];
	for (let key in settings.options) {
		if (settings.options[key].length === 0) {
			continue;
		}
		if (typeof settings.options[key] === 'boolean') {
			options.push('-' + key, settings.options[key] === true ? '1' : '0');
		} else {
			if (key === 'hls_flags') {
				options.push('-' + key, settings.options[key].join('+'));
			} else {
				options.push('-' + key, '' + settings.options[key]);
			}
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
	id: 'hls',
	name: 'HLS',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['http', 'https'], formats: ['hls'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source as HTTP-Live-Streaming (HLS) to an HTTP/S Server. More details about the settings can be found here.',
	description_links: [{ text: 'here', href: 'http://ffmpeg.org/ffmpeg-all.html#hls' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#hls',
	icon: { type: 'fontawesome-solid', name: 'faTools', color: '#39B54A' },
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
		{ key: 'options.headers', type: 'text', label: 'headers', advanced: true, section: 'General' },
		{ key: 'options.http_user_agent', type: 'text', label: 'http_user_agent', advanced: true, section: 'General' },
		{
			key: 'options.method',
			type: 'select',
			label: 'method',
			options: [
				{ value: '', label: 'default' },
				{ value: 'PUT', label: 'PUT' },
				{ value: 'POST', label: 'POST' },
			],
			advanced: true,
			section: 'General',
		},
		{ key: 'options.timeout', type: 'number', label: 'timeout', min: '0', step: '1', advanced: true, section: 'General' },
		{ key: 'options.hls_allow_cache', type: 'checkbox', label: 'hls_allow_cache', advanced: true, section: 'General' },
		{ key: 'options.http_persistent', type: 'checkbox', label: 'http_persistent', advanced: true, section: 'General' },
		{ key: 'options.ignore_io_errors', type: 'checkbox', label: 'ignore_io_errors', advanced: true, section: 'General' },
		{ key: 'options.hls_init_time', type: 'number', label: 'hls_init_time', min: '0', step: '1', advanced: true, section: 'Chunk' },
		{ key: 'options.hls_time', type: 'number', label: 'hls_time', min: '0', step: '1', advanced: true, section: 'Chunk' },
		{ key: 'options.hls_ts_options', type: 'text', label: 'hls_ts_options', advanced: true, section: 'Chunk' },
		{
			key: 'options.hls_playlist_type',
			type: 'select',
			label: 'hls_playlist_type',
			options: [
				{ value: '', label: 'none' },
				{ value: 'event', label: 'event' },
				{ value: 'vod', label: 'vod' },
			],
			advanced: true,
			section: 'Playlist',
		},
		{ key: 'options.hls_list_size', type: 'number', label: 'hls_list_size', min: '0', step: '1', advanced: true, section: 'Playlist' },
		{ key: 'options.hls_delete_threshold', type: 'number', label: 'hls_delete_threshold', min: '0', step: '1', advanced: true, section: 'Playlist' },
		{ key: 'options.hls_base_url', type: 'text', label: 'hls_base_url', advanced: true, section: 'Playlist' },
		{
			key: 'options.hls_flags',
			type: 'multiselect',
			label: 'hls_flags',
			options: [
				{ value: 'single_file', label: 'single_file' },
				{ value: 'delete_segments', label: 'delete_segments' },
				{ value: 'append_list', label: 'append_list' },
				{ value: 'round_durations', label: 'round_durations' },
				{ value: 'discont_start', label: 'discont_start' },
				{ value: 'omit_endlist', label: 'omit_endlist' },
				{ value: 'periodic_rekey', label: 'periodic_rekey' },
				{ value: 'independent_segments', label: 'independent_segments' },
				{ value: 'iframes_only', label: 'iframes_only' },
				{ value: 'split_by_time', label: 'split_by_time' },
				{ value: 'program_date_time', label: 'program_date_time' },
				{ value: 'second_level_segment_index', label: 'second_level_segment_index' },
				{ value: 'second_level_segment_size', label: 'second_level_segment_size' },
				{ value: 'second_level_segment_duration', label: 'second_level_segment_duration' },
				{ value: 'temp_file', label: 'temp_file' },
			],
			advanced: true,
			section: 'Playlist',
		},
		{
			key: 'options.hls_segment_type',
			type: 'select',
			label: 'hls_segment_type',
			options: [
				{ value: 'mpegts', label: 'mpegts' },
				{ value: 'fmp4', label: 'fmp4' },
			],
			advanced: true,
			section: 'Segmentation',
		},
		{ key: 'options.hls_segment_filename', type: 'text', label: 'hls_segment_filename', advanced: true, section: 'Segmentation' },
		{
			key: 'options.hls_fmp4_init_filename',
			type: 'text',
			label: 'hls_fmp4_init_filename',
			showIf: (settings) => settings.options.hls_segment_type === 'fmp4',
			advanced: true,
			section: 'Segmentation',
		},
		{
			key: 'options.hls_fmp4_init_resend',
			type: 'number',
			label: 'hls_fmp4_init_resend',
			min: '0',
			step: '1',
			showIf: (settings) => settings.options.hls_segment_type === 'fmp4',
			advanced: true,
			section: 'Segmentation',
		},
		{
			key: 'options.hls_start_number_source',
			type: 'select',
			label: 'hls_start_number_source',
			options: [
				{ value: 'generic', label: 'generic' },
				{ value: 'epoch', label: 'epoch' },
				{ value: 'epoch_us', label: 'epoch_us' },
				{ value: 'datetime', label: 'datetime' },
			],
			advanced: true,
			section: 'Segmentation',
		},
		{ key: 'options.start_number', type: 'number', label: 'start_number', min: '0', step: '1', advanced: true, section: 'Segmentation' },
		{ key: 'options.strftime_mkdir', type: 'text', label: 'strftime_mkdir', advanced: true, section: 'Segmentation' },
		{ key: 'options.hls_key_info_file', type: 'text', label: 'hls_key_info_file', advanced: true, section: 'Encryption' },
		{ key: 'options.hls_enc_key', type: 'text', label: 'hls_enc_key', advanced: true, section: 'Encryption' },
		{ key: 'options.hls_enc_key_url', type: 'text', label: 'hls_enc_key_url', advanced: true, section: 'Encryption' },
		{ key: 'options.hls_enc_iv', type: 'text', label: 'hls_enc_iv', advanced: true, section: 'Encryption' },
		{ key: 'options.hls_enc', type: 'checkbox', label: 'hls_enc', advanced: true, section: 'Encryption' },
	],
};

export default service;
