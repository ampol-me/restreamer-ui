// Ported from legacy/src/views/Publication/Services/MPEGTS.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	protocol: string;
	address: string;
	options: {
		service_provider: string;
		service_name: string;
		mpegts_transport_stream_id: string;
		mpegts_original_network_id: string;
		mpegts_service_id: string;
		mpegts_service_type: string;
		mpegts_service_type_hex_value: string;
		mpegts_pmt_start_pid: string;
		mpegts_start_pid: string;
		mpegts_m2ts_mode: boolean;
		muxrate: string;
		pes_payload_size: string;
		mpegts_flags: string[];
		mpegts_copyts: boolean;
		omit_video_pes_length: boolean;
		pcr_period: string;
		pat_period: string;
		sdt_period: string;
		tables_version: string;
	} & Record<string, any>;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		protocol: 'udp://',
		address: '',
		options: {},
		...settings,
	};
	initSettings.options = {
		service_provider: 'FFmpeg',
		service_name: 'Service01',
		mpegts_transport_stream_id: '0x0001',
		mpegts_original_network_id: '0x0001',
		mpegts_service_id: '0x0001',
		mpegts_service_type: 'digital_tv',
		mpegts_service_type_hex_value: '',
		mpegts_pmt_start_pid: '0x1000',
		mpegts_start_pid: '0x0100',
		mpegts_m2ts_mode: false,
		muxrate: '',
		pes_payload_size: '2930',
		mpegts_flags: [],
		mpegts_copyts: false,
		omit_video_pes_length: true,
		pcr_period: '-1',
		pat_period: '0.1',
		sdt_period: '0.5',
		tables_version: '0',
		...initSettings.options,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	const options = ['-f', 'mpegts'];
	for (let key in settings.options) {
		if (settings.options[key].length === 0) {
			continue;
		}
		if (['service_provider', 'service_name'].includes(key)) {
			options.push('-metadata', key + '="' + String(settings.options[key]) + '"');
		} else if (key === 'mpegts_service_type' && settings.options.mpegts_service_type === 'hex_value') {
			if (settings.options.mpegts_service_type_hex_value.length !== 0) {
				options.push('-mpegts_service_type', String(settings.options.mpegts_service_type_hex_value));
			}
		} else if (key === 'mpegts_service_type_hex_value') {
			continue;
		} else if (['mpegts_m2ts_mode', 'mpegts_copyts', 'omit_video_pes_length'].includes(key)) {
			if (settings.options[key]) {
				options.push('-' + key, '1');
			} else {
				options.push('-' + key, '-1');
			}
		} else if (key === 'mpegts_flags') {
			let flags = '';
			settings.options[key].forEach((flag) => {
				flags += '+' + flag;
			});
			options.push('-mpegts_flags', String(flags));
		} else {
			options.push('-' + key, String(settings.options[key]));
		}
	}
	const output = {
		address: settings.protocol + settings.address,
		options: options,
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'mpegts',
	name: 'MPEG-TS',
	version: '1.0',
	stream_key_link: '',
	category: 'universal',
	requires: { protocols: ['udp', 'tcp'], formats: ['mpegts'], codecs: { audio: ['aac', 'mp3'], video: ['h264', 'hevc', 'vp9', 'av1'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Transmit the main source to an MPEG-TS Service. More details about the settings can be found here here.',
	description_links: [{ text: 'here', href: 'https://ffmpeg.org/ffmpeg-all.html#mpegts-1' }],
	image_copyright: 'Please contact the operator of the service and check what happens.',
	documentation: 'https://ffmpeg.org/ffmpeg-all.html#mpegts-1',
	icon: { type: 'fontawesome-solid', name: 'faTools', color: '#39B54A' },
	init,
	createOutput,
	// Legacy binds pcr_period, pat_period, sdt_period and tables_version to settings.<name> for display but its handleChange
	// writes them to settings.options.<name>. The fields here use the options path.
	fields: [
		{ key: 'protocol', type: 'url', label: 'Protocol' },
		{ key: 'address', type: 'url', label: 'Address' },
		{ key: 'options.service_provider', type: 'text', label: 'service_provider', advanced: true },
		{ key: 'options.service_name', type: 'text', label: 'service_name', advanced: true },
		{ key: 'options.mpegts_transport_stream_id', type: 'text', label: 'mpegts_transport_stream_id', advanced: true },
		{ key: 'options.mpegts_original_network_id', type: 'text', label: 'mpegts_original_network_id', advanced: true },
		{ key: 'options.mpegts_service_id', type: 'text', label: 'mpegts_service_id', advanced: true },
		{
			key: 'options.mpegts_service_type',
			type: 'select',
			label: 'mpegts_service_type',
			options: [
				{ value: 'hex_value', label: 'hex_value' },
				{ value: 'digital_tv', label: 'digital_tv' },
				{ value: 'digital_radio', label: 'digital_radio' },
				{ value: 'teletext', label: 'teletext' },
				{ value: 'advanced_codec_digital_radio', label: 'advanced_codec_digital_radio' },
				{ value: 'mpeg2_digital_hdtv', label: 'mpeg2_digital_hdtv' },
				{ value: 'advanced_codec_digital_sdtv', label: 'advanced_codec_digital_sdtv' },
				{ value: 'advanced_codec_digital_hdtv', label: 'advanced_codec_digital_hdtv' },
			],
			advanced: true,
		},
		{
			key: 'options.mpegts_service_type_hex_value',
			type: 'text',
			label: 'mpegts_service_type: hex_value',
			showIf: (settings) => settings.options.mpegts_service_type === 'hex_value',
			advanced: true,
		},
		{ key: 'options.mpegts_pmt_start_pid', type: 'text', label: 'mpegts_pmt_start_pid', advanced: true },
		{ key: 'options.mpegts_start_pid', type: 'text', label: 'mpegts_start_pid', advanced: true },
		{ key: 'options.mpegts_m2ts_mode', type: 'checkbox', label: 'mpegts_m2ts_mode', advanced: true },
		{ key: 'options.muxrate', type: 'text', label: 'muxrate', advanced: true },
		{ key: 'options.pes_payload_size', type: 'text', label: 'pes_payload_size', advanced: true },
		{
			key: 'options.mpegts_flags',
			type: 'multiselect',
			label: 'mpegts_flags',
			options: [
				{ value: 'resend_headers', label: 'resend_headers' },
				{ value: 'latm', label: 'latm' },
				{ value: 'pat_pmt_at_frames', label: 'pat_pmt_at_frames' },
				{ value: 'system_b', label: 'system_b' },
				{ value: 'initial_discontinuity', label: 'initial_discontinuity' },
			],
			advanced: true,
		},
		{ key: 'options.mpegts_copyts', type: 'checkbox', label: 'mpegts_copyts', advanced: true },
		{ key: 'options.omit_video_pes_length', type: 'checkbox', label: 'omit_video_pes_length', advanced: true },
		{ key: 'options.pcr_period', type: 'text', label: 'pcr_period', advanced: true },
		{ key: 'options.pat_period', type: 'text', label: 'pat_period', advanced: true },
		{ key: 'options.sdt_period', type: 'text', label: 'sdt_period', advanced: true },
		{ key: 'options.tables_version', type: 'text', label: 'tables_version', advanced: true },
	],
};

export default service;
