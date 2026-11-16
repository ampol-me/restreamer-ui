// Ported from legacy/src/views/Publication/Services/Twitter.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	mode: string;
	stream_key: string;
	region: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		mode: 'rtmps',
		stream_key: '',
		region: 'de',
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
		// https://help.twitter.com/en/using-twitter/how-to-use-live-producer#RTMP
		outputs.push({
			address: 'rtmps://' + settings.region + '.pscp.tv:443/x/' + settings.stream_key,
			options: ['-f', 'flv'],
		});
	} else if (settings.mode === 'hls') {
		// https://help.twitter.com/en/using-twitter/how-to-use-live-producer#HLS
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
		const base = 'https://' + settings.region + '.pscp.tv:443/x/' + settings.stream_key;
		outputs.push({
			address: base + name + '.m3u8',
			options: [...options, '-hls_segment_filename', base + name + '_%d.ts'],
		});
	}
	return outputs;
}

const service: Service<Settings> = {
	id: 'twitter',
	name: 'Twitter',
	version: '1.0',
	stream_key_link: 'https://studio.twitter.com/producer/sources',
	category: 'platform',
	requires: { protocols: ['rtmps', 'https'], formats: ['flv', 'hls'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description:
		"Transmits your video stream with the required key, which was generated in Twitter Producer. You can find more information on seting up a live stream at Twitter's Producer.",
	description_links: [{ text: 'Producer', href: 'https://help.twitter.com/en/using-twitter/how-to-use-live-producer' }],
	image_copyright: "More about Twitter's copyright here.",
	image_copyright_links: [{ text: 'here', href: 'https://help.twitter.com/en/rules-and-policies/copyright-policy' }],
	icon: { type: 'fontawesome-brand', name: 'faTwitter', color: 'rgb(29, 161, 242)' },
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
					label: 'RTMPS',
					showIf: (settings, ctx) => (ctx.skills.protocols.includes('rtmps') && ctx.skills.formats.includes('flv')) === true,
				},
			],
		},
		{
			key: 'region',
			type: 'select',
			label: 'Region',
			options: [
				{ value: 'jp', label: 'Asia - Tokyo, Japan' },
				{ value: 'kr', label: 'Asia - Seoul, South Korea' },
				{ value: 'in', label: 'Asia - Mumbai, India' },
				{ value: 'sg', label: 'Asia - Singapore, Singapore' },
				{ value: 'au', label: 'Asia - Sydney, Australia' },
				{ value: 'de', label: 'EU - Frankfurt, Germany' },
				{ value: 'ie', label: 'EU - Dublin, Ireland' },
				{ value: 'fr', label: 'EU - Paris, France' },
				{ value: 'br', label: 'South America - São Paulo, Brazil' },
				{ value: 'va', label: 'US East - Northern Virginia, USA' },
				{ value: 'ca', label: 'US West - Oregon, USA' },
				{ value: 'or', label: 'US West - Northern California, USA' },
			],
			showIf: (settings) => settings.mode === 'rtmps',
		},
		{
			key: 'region',
			type: 'select',
			label: 'Region',
			options: [
				{ value: 'jp', label: 'Asia Pacific - Tokyo, Japan' },
				{ value: 'de', label: 'EU - Frankfurt, Germany' },
				{ value: 'va', label: 'US East - Northern Virginia, USA' },
				{ value: 'or', label: 'US West - Oregon, USA' },
			],
			showIf: (settings) => settings.mode === 'hls',
		},
		{ key: 'stream_key', type: 'text', label: 'Stream key', link: { label: 'GET', href: 'https://studio.twitter.com/producer/sources' } },
	],
};

export default service;
