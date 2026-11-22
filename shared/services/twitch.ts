// Ported from legacy/src/views/Publication/Services/Twitch.js
import type { Service, ServiceContext, ServiceOutput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	region: string;
	key: string;
}

function init(settings: Record<string, any> = {}): Settings {
	const initSettings = {
		region: 'live',
		key: '',
		...settings,
	};
	return initSettings as Settings;
}

function createOutput(settings: Settings, _ctx: ServiceContext): ServiceOutput[] {
	let region_postfix = '.twitch.tv';
	if (settings.region.includes('live-video.net')) {
		region_postfix = '';
	}
	const output = {
		address: 'rtmp://' + settings.region + region_postfix + '/app/' + settings.key,
		options: ['-f', 'flv'],
	};
	return [output];
}

const service: Service<Settings> = {
	id: 'twitch',
	name: 'Twitch',
	version: '1.1',
	stream_key_link: 'https://dashboard/settings/stream',
	category: 'platform',
	requires: { protocols: ['rtmp'], formats: ['flv'], codecs: { audio: ['aac', 'mp3'], video: ['h264'] } },
	author: { creator: { name: 'datarhei', link: 'https://github.com/datarhei' }, maintainer: { name: 'datarhei', link: 'https://github.com/datarhei' } },
	description: 'Live-Streaming to Twitch Live RTMP Service.',
	image_copyright: 'More about licenses here',
	icon: { type: 'fontawesome-brand', name: 'faTwitch', color: '#9147FF' },
	init,
	createOutput,
	fields: [
		{
			key: 'region',
			type: 'select',
			label: 'Region',
			options: [
				{ value: 'live', label: 'Autodetect' },
				{ value: 'live-hkg', label: 'Asia - Hong Kong' },
				{ value: 'blr01.contribute.live-video.net', label: 'Asia - India, Bangalore' },
				{ value: 'maa01.contribute.live-video.net', label: 'Asia - India, Chennai' },
				{ value: 'hyd01.contribute.live-video.net', label: 'Asia - India, Hyderabad' },
				{ value: 'bom01.contribute.live-video.net', label: 'Asia - India, Mumbai' },
				{ value: 'del01.contribute.live-video.net', label: 'Asia - India, New Delhi' },
				{ value: 'jkt01.contribute.live-video.net', label: 'Asia - Indonesia, Cikarang Barat' },
				{ value: 'jkt02.contribute.live-video.net', label: 'Asia - Indonesia, Jakarta' },
				{ value: 'osa01.contribute.live-video.net', label: 'Asia - Japan, Osaka' },
				{ value: 'live-tyo', label: 'Asia - Japan, Tokyo' },
				{ value: 'mnl01.contribute.live-video.net', label: 'Asia - Philippines, Manila' },
				{ value: 'live-sin', label: 'Asia - Singapore' },
				{ value: 'live-sel', label: 'Asia - South Korea, Seoul' },
				{ value: 'live-tpe', label: 'Asia - Taiwan, Taipei' },
				{ value: 'bkk02.contribute.live-video.net', label: 'Asia - Thailand, Bangkok' },
				{ value: 'live-vie', label: 'Europe - Austria, Vienna' },
				{ value: 'live-prg', label: 'Europe - Czech Republic, Prague' },
				{ value: 'live-cph', label: 'Europe - Denmark, Copenhagen' },
				{ value: 'live-hel', label: 'Europe - Finland, Helsinki' },
				{ value: 'live-mrs', label: 'Europe - France, Marseille' },
				{ value: 'live-cdg', label: 'Europe - France, Paris' },
				{ value: 'live-ber', label: 'Europe - Germany, Berlin' },
				{ value: 'dus01.contribute.live-video.net', label: 'Europe - Germany, Dusseldorf' },
				{ value: 'live-fra', label: 'Europe - Germany, Frankfurt' },
				{ value: 'muc01.contribute.live-video.net', label: 'Europe - Germany, Munich' },
				{ value: 'live-mil', label: 'Europe - Italy, Milan' },
				{ value: 'live-ams', label: 'Europe - Netherlands, Amsterdam' },
				{ value: 'live-osl', label: 'Europe - Norway, Oslo' },
				{ value: 'live-waw', label: 'Europe - Poland, Warsaw' },
				{ value: 'live-lis', label: 'Europe - Portugal, Lisbon' },
				{ value: 'live-mad', label: 'Europe - Spain, Madrid' },
				{ value: 'live-arn', label: 'Europe - Sweden, Stockholm' },
				{ value: 'live-lhr', label: 'Europe - UK, London' },
				{ value: 'live-ymq', label: 'NA - Canada, Quebec' },
				{ value: 'live-yto', label: 'NA - Canada, Toronto' },
				{ value: 'live-qro', label: 'NA - Mexico, Queretaro' },
				{ value: 'live-syd', label: 'Oceania - Australia, Sydney' },
				{ value: 'live-scl', label: 'South America - chile, Santiago' },
				{ value: 'for01.contribute.live-video.net', label: 'South America - Brazil, Fortaleza' },
				{ value: 'live-rio', label: 'South America - Brazil, Rio de Janeiro' },
				{ value: 'live-sao', label: 'South America - Brazil, Sao Paulo' },
				{ value: 'live-eze', label: 'South America - Buenos Aires, Argentina' },
				{ value: 'bog01.contribute.live-video.net', label: 'South America - Colombia, Bogota' },
				{ value: 'live-mde', label: 'South America - Colombia, Medellin' },
				{ value: 'live-lim', label: 'South America - Peru, Lima' },
				{ value: 'live-dfw', label: 'US Central - Dallas, TX' },
				{ value: 'live-den', label: 'US Central - Denver, CO' },
				{ value: 'dfw56.contribute.live-video.net', label: 'US Central - Garland, TX' },
				{ value: 'live-hou', label: 'US Central - Houston, TX' },
				{ value: 'live-slc', label: 'US Central - Salt Lake City, UT' },
				{ value: 'live-iad', label: 'US East - Ashburn, VA' },
				{ value: 'live-atl', label: 'US East - Atlanta, GA' },
				{ value: 'live-ord', label: 'US East - Chicago, IL' },
				{ value: 'mfe01.contribute.live-video.net', label: 'US East - McAllen, TX' },
				{ value: 'live-mia', label: 'US East - Miami, FL' },
				{ value: 'live-jfk', label: 'US East - New York, NY' },
				{ value: 'live-lax', label: 'US West - Los Angeles, CA' },
				{ value: 'live-phx', label: 'US West - Phoenix, AZ' },
				{ value: 'live-pdx', label: 'US West - Portland, Oregon' },
				{ value: 'slc.contribute.live-video.net', label: 'US West - Salt Lake City, UT' },
				{ value: 'live-sfo', label: 'US West - San Francisco, CA' },
				{ value: 'live-sjc', label: 'US West - San Jose, CA' },
				{ value: 'live-sea', label: 'US West - Seattle, WA' },
			],
		},
		{ key: 'key', type: 'text', label: 'Stream key', link: { label: 'GET', href: 'https://dashboard/settings/stream' } },
	],
};

export default service;
