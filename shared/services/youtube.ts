// Ported from legacy/src/views/Publication/Services/Youtube.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	mode: string;
	stream_key: string;
	primary: boolean;
	backup: boolean;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		mode: 'rtmps',
		stream_key: '',
		primary: true,
		backup: false,
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, ctx: ServiceContext): ServiceOutput[] {
	const outputs: ServiceOutput[] = [];
	if (settings.stream_key.length === 0) {
		return outputs;
	}
	if (settings.mode === 'rtmps') {
		let options = ['-f', 'flv'];
		if (ctx.skills.ffmpeg.version_major >= 6) {
			const codecs = [];
			if (ctx.skills.codecs.video.includes('hevc')) {
				codecs.push('hvc1');
			}
			if (ctx.skills.codecs.video.includes('av1')) {
				codecs.push('av01');
			}
			if (codecs.length !== 0) {
				options.push('-rtmp_enhanced_codecs', codecs.join(','));
			}
		}

		// https://developers.google.com/youtube/v3/live/guides/rtmps-ingestion
		if (settings.primary === true) {
			outputs.push({
				address: 'rtmps://a.rtmp.youtube.com/live2/' + settings.stream_key,
				options: options.slice(),
			});
		}
		if (settings.backup === true) {
			outputs.push({
				address: 'rtmps://b.rtmp.youtube.com/live2?backup=1/' + settings.stream_key,
				options: options.slice(),
			});
		}
	} else if (settings.mode === 'hls') {
		// https://developers.google.com/youtube/v3/live/guides/hls-ingestion
		const name = ctx.uuid?.() ?? crypto.randomUUID();
		const options = [
			'-f',
			'hls',
			'-start_number',
			'0',
			'-hls_time',
			'2',
			'-hls_delete_threshold',
			'3',
			'-hls_list_size',
			'5',
			'-hls_flags',
			'append_list',
			'-hls_segment_type',
			'mpegts',
			'-http_persistent',
			'1',
			'-y',
			'-method',
			'PUT',
		];
		if (settings.primary === true) {
			const base = `https://a.upload.youtube.com/http_upload_hls?cid=${settings.stream_key}&copy=0&file=`;
			outputs.push({
				address: base + name + '.m3u8',
				options: [...options, '-hls_segment_filename', base + name + '_%d.ts'],
			});
		}
		if (settings.backup === true) {
			const base = `https://b.upload.youtube.com/http_upload_hls?cid=${settings.stream_key}&copy=1&file=`;
			outputs.push({
				address: base + name + '.m3u8',
				options: [...options, '-hls_segment_filename', base + name + '_%d.ts'],
			});
		}
	}
	return outputs;
}

const service: Service<Settings> = {
	id: 'youtube',
	name: 'YouTube Live',
	version: '1.1',
	stream_key_link: 'https://www.youtube.com/live_dashboard',
	category: 'platform',
	requires: { protocols: ['rtmps', 'https'], formats: ['flv', 'hls'], codecs: { audio: ['aac', 'mp3'], video: ['h264', 'hevc', 'av1'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description:
		"Transmits your video as an RTMP stream with the required key generated in YouTube Studio. You can find more information on setting up a live stream at YouTube's Creator Academy.",
	description_links: [{ text: 'Creator Academy', href: 'https://creatoracademy.youtube.com/' }],
	image_copyright: "More about YouTube's copyright here.",
	image_copyright_links: [{ text: 'here', href: 'https://www.youtube.com/howyoutubeworks/policies/copyright/#support-and-troubleshooting' }],
	icon: { type: 'fontawesome-brand', name: 'faYoutube', color: '#FF0000' },
	init,
	createOutput,
	fields: [
		{
			key: 'mode',
			type: 'select',
			label: 'Delivering mode',
			options: [
				{
					value: 'rtmps',
					label: 'RTMP',
					showIf: (settings, ctx) => (ctx.skills.protocols.includes('rtmps') && ctx.skills.formats.includes('flv')) === true,
				},
				{
					value: 'hls',
					label: 'HLS',
					showIf: (settings, ctx) => (ctx.skills.protocols.includes('https') && ctx.skills.formats.includes('hls')) === true,
				},
			],
		},
		{ key: 'stream_key', type: 'text', label: 'Stream key', link: { label: 'GET', href: 'https://www.youtube.com/live_dashboard' } },
		{ key: 'primary', type: 'checkbox', label: 'Primary stream' },
		{ key: 'backup', type: 'checkbox', label: 'Backup stream' },
	],
};

export default service;
