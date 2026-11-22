import { describe, expect, test } from 'bun:test';

import registry, { Registry } from './index';
import dummy from './dummy';
import type { Service, ServiceContext } from './types';
import legacyContexts from '../__fixtures__/services/contexts.json';
import legacyOutputs from '../__fixtures__/services/outputs.json';

/* eslint-disable @typescript-eslint/no-explicit-any */

// Read from legacy/src/views/Publication/Services/index.js (registration order) and the `id` of each legacy file.
const legacyIDs = [
	'facebook',
	'youtube',
	'twitter',
	'twitch',
	'kick',
	'instagram',
	'vimeo',
	'restream',
	'telegram',
	'linkedin',
	'dlive',
	'trovo',
	'picartotv',
	'nimotv',
	'peertube',
	'medianetwork',
	'livespotting',
	'wettercom',
	'azure',
	'brightcove',
	'akamai',
	'dacast',
	'dailymotion',
	'livepush',
	'rumble',
	'cdn77',
	'datarheicore',
	'owncast',
	'wowza',
	'red5',
	'icecast',
	'image2',
	'rtsp',
	'rtmp',
	'hls',
	'dash',
	'srt',
	'udp',
	'mpegts',
	'framebuffer',
];

function makeCtx(overrides: Record<string, any> = {}): ServiceContext {
	const { ffmpeg, video, ...rest } = overrides;
	return {
		skills: {
			ffmpeg: { version: '5.1.2', version_major: ffmpeg ?? 5, version_minor: 1 },
			protocols: ['rtmp', 'rtmps', 'https', 'http', 'srt', 'udp', 'tcp', 'rtp', 'icecast'],
			formats: ['flv', 'hls', 'mpegts', 'dash', 'rtsp', 'adts', 'webm', 'image2', 'fbdev'],
			codecs: {
				audio: ['aac', 'mp3'],
				video: video ?? ['h264'],
			},
			devices: {
				fbdev: [
					{ id: '/dev/fb0', name: 'fb0', extra: 'vc4drmfb' },
					{ id: '/dev/fb1', name: 'fb1', extra: '' },
				],
			},
		},
		metadata: { name: 'My Stream', description: 'Desc', license: 'CC BY 4.0' },
		streams: [
			{ type: 'video', codec: 'h264' },
			{ type: 'audio', codec: 'aac' },
		],
		uuid: () => 'UUID',
		...rest,
	};
}

function get(id: string): Service<any> {
	const service = registry.Get(id);
	if (service === null) {
		throw new Error(`service ${id} is not registered`);
	}
	return service;
}

// Outputs for `settings` (merged with the defaults by init) as the legacy component would have reported them.
function outputs(id: string, settings: Record<string, any> = {}, ctx: ServiceContext = makeCtx()) {
	const service = get(id);
	return service.createOutput(service.init(settings, ctx.metadata), ctx);
}

function has(obj: any, path: string): boolean {
	let o = obj;
	for (const part of path.split('.')) {
		if (o === null || typeof o !== 'object' || !(part in o)) {
			return false;
		}
		o = o[part];
	}
	return true;
}

describe('registry', () => {
	test('lists every legacy service exactly once and in the legacy order', () => {
		expect(registry.IDs()).toEqual(legacyIDs);
		expect(new Set(registry.IDs()).size).toBe(legacyIDs.length);
		expect(registry.List().map((s) => s.id)).toEqual(legacyIDs);
	});

	test('Get', () => {
		expect(registry.Get('youtube')?.name).toBe('YouTube Live');
		expect(registry.Get('nope')).toBeNull();
		// the dummy service is not registered in legacy either
		expect(registry.Get('dummy')).toBeNull();
	});

	test('Register rejects invalid ids', () => {
		const r = new Registry();
		const warn = console.warn;
		console.warn = () => {};
		try {
			r.Register({ ...dummy, id: 'Not-Valid' });
		} finally {
			console.warn = warn;
		}
		expect(r.IDs()).toEqual([]);
		r.Register(dummy);
		expect(r.IDs()).toEqual(['dummy']);
	});
});

describe('every service', () => {
	const ctx = makeCtx();

	for (const service of [...registry.List(), dummy]) {
		test(service.id, () => {
			expect(service.id).toMatch(/^[0-9a-z]+$/);
			expect(typeof service.name).toBe('string');
			expect(typeof service.version).toBe('string');
			expect(typeof service.stream_key_link).toBe('string');
			expect(typeof service.description).toBe('string');
			expect(typeof service.image_copyright).toBe('string');
			expect(['platform', 'universal', 'software']).toContain(service.category);
			expect(typeof service.requires).toBe('object');
			expect(typeof service.author.creator.name).toBe('string');
			expect(typeof service.author.maintainer.name).toBe('string');
			expect(typeof service.icon.name).toBe('string');

			expect(typeof service.init({})).toBe('object');

			const settings = service.init({}, ctx.metadata);
			expect(settings).not.toBeNull();
			expect(typeof settings).toBe('object');

			// init must not drop or overwrite given settings
			expect(service.init({ ...settings, some_unknown_setting: 'x' }, ctx.metadata)).toEqual({ ...settings, some_unknown_setting: 'x' });

			const out = service.createOutput(settings, ctx);
			expect(Array.isArray(out)).toBe(true);
			for (const o of out) {
				if (o === null) {
					// legacy nimotv without stream key
					expect(service.id).toBe('nimotv');
					continue;
				}
				expect(typeof o.address).toBe('string');
				expect(Array.isArray(o.options)).toBe(true);
			}

			expect(service.fields.length).toBeGreaterThan(0);
			for (const field of service.fields) {
				expect(has(settings, field.key)).toBe(true);
				expect(typeof field.label).toBe('string');
				if (field.showIf) {
					expect(typeof field.showIf(settings, ctx)).toBe('boolean');
				}
				if (field.type === 'select' || field.type === 'multiselect') {
					const options = typeof field.options === 'function' ? field.options(settings, ctx) : field.options;
					expect(Array.isArray(options)).toBe(true);
					expect(options!.length).toBeGreaterThan(0);
				}
			}
		});
	}
});

// Golden fixtures recorded from the legacy React components, see scripts/legacy/gen-services-fixtures.ts
describe('legacy parity', () => {
	const cases = legacyOutputs as unknown as Record<string, { context: number; input: Record<string, any>; settings?: any; outputs: any[] }[]>;
	const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

	test('fixtures cover all services', () => {
		expect(Object.keys(cases).sort()).toEqual([...legacyIDs, 'dummy'].sort());
	});

	for (const service of [...registry.List(), dummy] as Service<any>[]) {
		test(service.id, () => {
			const list = cases[service.id]!;
			expect(list.length).toBeGreaterThan(0);

			for (const c of list) {
				const ctx: ServiceContext = { ...clone(legacyContexts[c.context]!), uuid: () => 'UUID' };
				let settings = service.init(clone(c.input), ctx.metadata);
				if (service.id === 'datarheicore') {
					// the fixture was recorded by re-entering the current address into the legacy form
					settings = service.handleChange!(settings, 'v2_address', settings.v2_address, ctx);
				}
				const outputs = service.createOutput(settings, ctx);

				// compare as JSON, as that's how the settings and outputs get stored
				expect(clone(outputs)).toEqual(c.outputs);
				if (c.settings !== undefined) {
					expect(clone(settings)).toEqual(c.settings);
				}
			}
		});
	}
});

describe('youtube', () => {
	test('no stream key', () => {
		expect(outputs('youtube')).toEqual([]);
	});

	test('rtmps primary', () => {
		expect(outputs('youtube', { stream_key: 'abc' })).toEqual([{ address: 'rtmps://a.rtmp.youtube.com/live2/abc', options: ['-f', 'flv'] }]);
	});

	test('rtmps primary + backup', () => {
		expect(outputs('youtube', { stream_key: 'abc', backup: true })).toEqual([
			{ address: 'rtmps://a.rtmp.youtube.com/live2/abc', options: ['-f', 'flv'] },
			{ address: 'rtmps://b.rtmp.youtube.com/live2?backup=1/abc', options: ['-f', 'flv'] },
		]);
	});

	test('rtmps backup only', () => {
		expect(outputs('youtube', { stream_key: 'abc', primary: false, backup: true })).toEqual([
			{ address: 'rtmps://b.rtmp.youtube.com/live2?backup=1/abc', options: ['-f', 'flv'] },
		]);
	});

	test('ffmpeg 5 ignores hevc/av1', () => {
		expect(outputs('youtube', { stream_key: 'abc' }, makeCtx({ ffmpeg: 5, video: ['h264', 'hevc', 'av1'] }))).toEqual([
			{ address: 'rtmps://a.rtmp.youtube.com/live2/abc', options: ['-f', 'flv'] },
		]);
	});

	test('ffmpeg 6 enables enhanced codecs', () => {
		expect(outputs('youtube', { stream_key: 'abc', backup: true }, makeCtx({ ffmpeg: 6, video: ['h264', 'hevc', 'av1'] }))).toEqual([
			{ address: 'rtmps://a.rtmp.youtube.com/live2/abc', options: ['-f', 'flv', '-rtmp_enhanced_codecs', 'hvc1,av01'] },
			{ address: 'rtmps://b.rtmp.youtube.com/live2?backup=1/abc', options: ['-f', 'flv', '-rtmp_enhanced_codecs', 'hvc1,av01'] },
		]);
		expect(outputs('youtube', { stream_key: 'abc' }, makeCtx({ ffmpeg: 6, video: ['h264', 'av1'] }))).toEqual([
			{ address: 'rtmps://a.rtmp.youtube.com/live2/abc', options: ['-f', 'flv', '-rtmp_enhanced_codecs', 'av01'] },
		]);
		expect(outputs('youtube', { stream_key: 'abc' }, makeCtx({ ffmpeg: 6, video: ['h264'] }))).toEqual([
			{ address: 'rtmps://a.rtmp.youtube.com/live2/abc', options: ['-f', 'flv'] },
		]);
	});

	test('hls', () => {
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
		const a = 'https://a.upload.youtube.com/http_upload_hls?cid=abc&copy=0&file=';
		const b = 'https://b.upload.youtube.com/http_upload_hls?cid=abc&copy=1&file=';

		expect(outputs('youtube', { mode: 'hls', stream_key: 'abc', backup: true }, makeCtx({ ffmpeg: 6, video: ['h264', 'hevc'] }))).toEqual([
			{ address: a + 'UUID.m3u8', options: [...options, '-hls_segment_filename', a + 'UUID_%d.ts'] },
			{ address: b + 'UUID.m3u8', options: [...options, '-hls_segment_filename', b + 'UUID_%d.ts'] },
		]);
	});

	test('hls falls back to a random uuid', () => {
		const out = outputs('youtube', { mode: 'hls', stream_key: 'abc' }, makeCtx({ uuid: undefined }));
		expect(out[0]!.address).toMatch(/&file=[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.m3u8$/);
	});

	test('mode options depend on the skills', () => {
		const field = get('youtube').fields.find((f) => f.key === 'mode')!;
		const options = field.options as any[];
		const ctx = makeCtx();
		ctx.skills.protocols = ['https'];
		expect(options.filter((o) => !o.showIf || o.showIf({}, ctx)).map((o) => o.value)).toEqual(['hls']);
		ctx.skills.protocols = ['rtmps', 'https'];
		expect(options.filter((o) => !o.showIf || o.showIf({}, ctx)).map((o) => o.value)).toEqual(['rtmps', 'hls']);
	});
});

describe('twitch', () => {
	test('autodetect region', () => {
		expect(outputs('twitch', { key: 'live_123' })).toEqual([{ address: 'rtmp://live.twitch.tv/app/live_123', options: ['-f', 'flv'] }]);
	});

	test('twitch.tv region', () => {
		expect(outputs('twitch', { region: 'live-fra', key: 'live_123' })).toEqual([
			{ address: 'rtmp://live-fra.twitch.tv/app/live_123', options: ['-f', 'flv'] },
		]);
	});

	test('live-video.net region', () => {
		expect(outputs('twitch', { region: 'muc01.contribute.live-video.net', key: 'live_123' })).toEqual([
			{ address: 'rtmp://muc01.contribute.live-video.net/app/live_123', options: ['-f', 'flv'] },
		]);
	});

	test('without key (legacy still emits the output)', () => {
		expect(outputs('twitch')).toEqual([{ address: 'rtmp://live.twitch.tv/app/', options: ['-f', 'flv'] }]);
	});
});

describe('facebook', () => {
	test('no keys', () => {
		expect(outputs('facebook')).toEqual([]);
	});

	test('primary', () => {
		expect(outputs('facebook', { stream_key_primary: 'FB-1' })).toEqual([
			{ address: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-1', options: ['-f', 'flv'] },
		]);
	});

	test('backup key is ignored unless the backup stream is enabled', () => {
		expect(outputs('facebook', { stream_key_primary: 'FB-1', stream_key_backup: 'FB-2' })).toEqual([
			{ address: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-1', options: ['-f', 'flv'] },
		]);
	});

	test('primary + backup', () => {
		expect(outputs('facebook', { stream_key_primary: 'FB-1', stream_key_backup: 'FB-2', rtmp_backup: true })).toEqual([
			{ address: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-1', options: ['-f', 'flv'] },
			{ address: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-2', options: ['-f', 'flv'] },
		]);
	});

	test('backup only', () => {
		expect(outputs('facebook', { stream_key_primary: 'FB-1', stream_key_backup: 'FB-2', rtmp_primary: false, rtmp_backup: true })).toEqual([
			{ address: 'rtmps://live-api-s.facebook.com:443/rtmp/FB-2', options: ['-f', 'flv'] },
		]);
	});
});

describe('rtmp', () => {
	test('defaults', () => {
		expect(outputs('rtmp')).toEqual([{ address: 'rtmp://', options: ['-f', 'flv', '-rtmp_flashver', 'FMLE/3.0'] }]);
	});

	test('address and stream key', () => {
		expect(outputs('rtmp', { address: 'example.com/live', options: { rtmp_playpath: 'key' } })).toEqual([
			{ address: 'rtmp://example.com/live', options: ['-f', 'flv', '-rtmp_playpath', 'key', '-rtmp_flashver', 'FMLE/3.0'] },
		]);
	});

	test('rtmp_flush_interval only for rtmpt(s)', () => {
		expect(outputs('rtmp', { protocol: 'rtmpts://', address: 'example.com/live', options: { rtmp_app: 'live', rtmp_swfsize: '12' } })).toEqual([
			{
				address: 'rtmpts://example.com/live',
				options: ['-f', 'flv', '-rtmp_app', 'live', '-rtmp_flashver', 'FMLE/3.0', '-rtmp_flush_interval', '10', '-rtmp_swfsize', '12'],
			},
		]);
	});

	test('ffmpeg 6 enables enhanced codecs', () => {
		expect(outputs('rtmp', { address: 'example.com/live' }, makeCtx({ ffmpeg: 6, video: ['h264', 'vp9', 'av1', 'hevc'] }))).toEqual([
			{ address: 'rtmp://example.com/live', options: ['-f', 'flv', '-rtmp_enhanced_codecs', 'hvc1,av01,vp09', '-rtmp_flashver', 'FMLE/3.0'] },
		]);
		expect(outputs('rtmp', { address: 'example.com/live' }, makeCtx({ ffmpeg: 5, video: ['h264', 'vp9', 'av1', 'hevc'] }))).toEqual([
			{ address: 'rtmp://example.com/live', options: ['-f', 'flv', '-rtmp_flashver', 'FMLE/3.0'] },
		]);
	});

	test('handleChange moves the protocol out of the address', () => {
		const service = get('rtmp');
		const ctx = makeCtx();
		ctx.skills.protocols = ['rtmp', 'rtmps'];

		let settings = service.handleChange!(service.init({}), 'address', 'rtmps://example.com/live', ctx);
		expect(settings.protocol).toBe('rtmps://');
		expect(settings.address).toBe('example.com/live');

		// protocol not available: the value is kept as is
		settings = service.handleChange!(service.init({}), 'address', 'rtmpt://example.com/live', ctx);
		expect(settings.protocol).toBe('rtmp://');
		expect(settings.address).toBe('rtmpt://example.com/live');

		// legacy regex requires a character after "rtmp", i.e. plain rtmp:// is not stripped
		settings = service.handleChange!(service.init({}), 'address', 'rtmp://example.com/live', ctx);
		expect(settings.protocol).toBe('rtmp://');
		expect(settings.address).toBe('rtmp://example.com/live');

		settings = service.handleChange!(service.init({}), 'options.rtmp_playpath', 'key', ctx);
		expect(settings.options.rtmp_playpath).toBe('key');
		settings = service.handleChange!(settings, 'rtmp_app', 'live', ctx);
		expect(settings.options.rtmp_app).toBe('live');
		expect(settings.rtmp_app).toBeUndefined();
	});
});

describe('srt', () => {
	const options = ['-bsf:v', 'dump_extra', '-f', 'mpegts'];

	test('defaults', () => {
		expect(outputs('srt')).toEqual([{ address: 'srt://?transtype=live', options }]);
	});

	test('only non-default params are part of the address', () => {
		expect(
			outputs('srt', {
				address: 'example.com:6000',
				params: { streamid: 'abc', passphrase: 'secret', nakreport: false, latency: '20000', mode: 'caller', enforced_encryption: true },
			}),
		).toEqual([
			{ address: 'srt://example.com:6000?latency=20000&nakreport=0&streamid=abc&transtype=live&passphrase=secret&enforced_encryption=1', options },
		]);
	});

	test('transtype file', () => {
		expect(outputs('srt', { address: 'example.com:6000', params: { transtype: 'file', mode: 'listener' } })).toEqual([
			{ address: 'srt://example.com:6000?mode=listener&transtype=file', options },
		]);
	});
});

describe('hls', () => {
	const defaults = [
		'-f',
		'hls',
		'-hls_init_time',
		'0',
		'-hls_time',
		'2',
		'-hls_list_size',
		'5',
		'-hls_delete_threshold',
		'1',
		'-hls_start_number_source',
		'generic',
		'-start_number',
		'0',
		'-hls_allow_cache',
		'0',
		'-hls_enc',
		'0',
		'-hls_segment_type',
		'mpegts',
		'-hls_fmp4_init_filename',
		'init.mp4',
		'-hls_fmp4_init_resend',
		'0',
		'-method',
		'PUT',
		'-http_persistent',
		'0',
		'-ignore_io_errors',
		'0',
	];

	test('defaults', () => {
		expect(outputs('hls', { address: 'example.com/live/stream.m3u8' })).toEqual([{ address: 'https://example.com/live/stream.m3u8', options: defaults }]);
	});

	test('credentials are put into the address', () => {
		expect(outputs('hls', { address: 'example.com/live/stream.m3u8', username: 'user', password: 'p@ss/word' })).toEqual([
			// legacy encodes the credentials with encodeURIComponent and url-parse encodes them again
			{ address: 'https://user:p%2540ss%252Fword@example.com/live/stream.m3u8', options: defaults },
		]);
		expect(outputs('hls', { protocol: 'http://', address: 'example.com/live/stream.m3u8', username: 'user' })).toEqual([
			{ address: 'http://user@example.com/live/stream.m3u8', options: defaults },
		]);
	});

	test('flags, booleans and removed defaults', () => {
		expect(
			outputs('hls', {
				address: 'example.com/live/stream.m3u8',
				options: { hls_flags: ['delete_segments', 'append_list'], http_persistent: true, method: '', hls_time: '4', headers: 'X-Test: 1' },
			}),
		).toEqual([
			{
				address: 'https://example.com/live/stream.m3u8',
				options: [
					'-f',
					'hls',
					'-hls_init_time',
					'0',
					'-hls_time',
					'4',
					'-hls_list_size',
					'5',
					'-hls_delete_threshold',
					'1',
					'-hls_start_number_source',
					'generic',
					'-start_number',
					'0',
					'-hls_allow_cache',
					'0',
					'-hls_enc',
					'0',
					'-hls_segment_type',
					'mpegts',
					'-hls_fmp4_init_filename',
					'init.mp4',
					'-hls_fmp4_init_resend',
					'0',
					'-hls_flags',
					'delete_segments+append_list',
					'-http_persistent',
					'1',
					'-ignore_io_errors',
					'0',
					'-headers',
					'X-Test: 1',
				],
			},
		]);
	});
});

describe('mpegts', () => {
	test('defaults', () => {
		expect(outputs('mpegts', { address: '239.0.0.1:1234' })).toEqual([
			{
				address: 'udp://239.0.0.1:1234',
				options: [
					'-f',
					'mpegts',
					'-metadata',
					'service_provider="FFmpeg"',
					'-metadata',
					'service_name="Service01"',
					'-mpegts_transport_stream_id',
					'0x0001',
					'-mpegts_original_network_id',
					'0x0001',
					'-mpegts_service_id',
					'0x0001',
					'-mpegts_service_type',
					'digital_tv',
					'-mpegts_pmt_start_pid',
					'0x1000',
					'-mpegts_start_pid',
					'0x0100',
					'-mpegts_m2ts_mode',
					'-1',
					'-pes_payload_size',
					'2930',
					'-mpegts_copyts',
					'-1',
					'-omit_video_pes_length',
					'1',
					'-pcr_period',
					'-1',
					'-pat_period',
					'0.1',
					'-sdt_period',
					'0.5',
					'-tables_version',
					'0',
				],
			},
		]);
	});

	test('hex service type, flags, muxrate', () => {
		const out = outputs('mpegts', {
			protocol: 'tcp://',
			address: '10.0.0.1:1234',
			options: {
				mpegts_service_type: 'hex_value',
				mpegts_service_type_hex_value: '0x19',
				mpegts_flags: ['resend_headers', 'latm'],
				muxrate: '4000000',
				mpegts_m2ts_mode: true,
				omit_video_pes_length: false,
				service_name: '',
			},
		});
		expect(out).toEqual([
			{
				address: 'tcp://10.0.0.1:1234',
				options: [
					'-f',
					'mpegts',
					'-metadata',
					'service_provider="FFmpeg"',
					'-mpegts_transport_stream_id',
					'0x0001',
					'-mpegts_original_network_id',
					'0x0001',
					'-mpegts_service_id',
					'0x0001',
					'-mpegts_service_type',
					'0x19',
					'-mpegts_pmt_start_pid',
					'0x1000',
					'-mpegts_start_pid',
					'0x0100',
					'-mpegts_m2ts_mode',
					'1',
					'-muxrate',
					'4000000',
					'-pes_payload_size',
					'2930',
					'-mpegts_flags',
					'+resend_headers+latm',
					'-mpegts_copyts',
					'-1',
					'-omit_video_pes_length',
					'-1',
					'-pcr_period',
					'-1',
					'-pat_period',
					'0.1',
					'-sdt_period',
					'0.5',
					'-tables_version',
					'0',
				],
			},
		]);
	});

	test('hex service type without a value drops the option', () => {
		const out = outputs('mpegts', { address: '239.0.0.1:1234', options: { mpegts_service_type: 'hex_value' } });
		expect(out[0]!.options).not.toContain('-mpegts_service_type');
	});
});

describe('udp', () => {
	test('defaults (legacy emits booleans as true/false)', () => {
		expect(outputs('udp', { address: '10.0.0.1:5000' })).toEqual([
			{ address: 'udp://10.0.0.1:5000?buffer_size=32&overrun_nonfatal=false&broadcast=false', options: ['-f', 'mpegts'] },
		]);
	});

	test('params', () => {
		expect(outputs('udp', { address: '10.0.0.1:5000', params: { buffer_size: '', pkt_size: '1316', ttl: '4', broadcast: true } })).toEqual([
			{ address: 'udp://10.0.0.1:5000?pkt_size=1316&ttl=4&overrun_nonfatal=false&broadcast=true', options: ['-f', 'mpegts'] },
		]);
	});
});

describe('icecast', () => {
	const ice = ['-ice_name', 'My Stream', '-ice_description', 'Desc', '-ice_public', 'true', '-legacy_icecast', 'false', '-tls', 'false'];
	const address = 'icecast://source:hackme@example.com:8000/stream';
	const settings = { address: 'source:hackme@example.com:8000/stream' };
	const audio = (codec: string) => makeCtx({ streams: [{ type: 'audio', codec }] });

	test('audio only', () => {
		expect(outputs('icecast', settings, audio('aac'))).toEqual([{ address, options: [...ice, '-content_type', 'audio/aac', '-f', 'adts'] }]);
		expect(outputs('icecast', settings, audio('vorbis'))).toEqual([{ address, options: [...ice, '-content_type', 'audio/ogg', '-f', 'ogg'] }]);
		expect(outputs('icecast', settings, audio('opus'))).toEqual([{ address, options: [...ice, '-content_type', 'audio/ogg', '-f', 'opus'] }]);
		expect(outputs('icecast', settings, audio('mp3'))).toEqual([{ address, options: [...ice, '-content_type', 'audio/mpeg', '-f', 'mp3'] }]);
		expect(outputs('icecast', settings, audio('flac'))).toEqual([{ address, options: ice }]);
	});

	test('with video', () => {
		expect(outputs('icecast', settings)).toEqual([
			{ address, options: [...ice, '-f', 'webm', '-cluster_size_limit', '2', '-cluster_time_limit', '5100', '-content_type', 'video/webm'] },
		]);
	});

	test('options', () => {
		expect(outputs('icecast', { ...settings, options: { ice_genre: 'Rock', ice_public: false, tls: true, ice_name: 'Stored' } }, audio('mp3'))).toEqual([
			{
				address,
				options: [
					'-ice_genre',
					'Rock',
					'-ice_name',
					'Stored',
					'-ice_description',
					'Desc',
					'-ice_public',
					'false',
					'-legacy_icecast',
					'false',
					'-tls',
					'true',
					'-content_type',
					'audio/mpeg',
					'-f',
					'mp3',
				],
			},
		]);
	});

	test('createOutput applies the defaults itself (legacy createOutputs)', () => {
		const ctx = audio('aac');
		expect(get('icecast').createOutput(settings, ctx)).toEqual([{ address, options: [...ice, '-content_type', 'audio/aac', '-f', 'adts'] }]);
	});
});

describe('dash', () => {
	const defaults = [
		'-strict',
		'experimental',
		'-f',
		'dash',
		'-seg_duration',
		'2',
		'-window_size',
		'6',
		'-remove_at_exit',
		0,
		'-use_template',
		1,
		'-use_timeline',
		1,
		'-single_file',
		0,
		'-init_seg_name',
		'init-stream$RepresentationID$.$ext$',
		'-media_seg_name',
		'chunk-stream$RepresentationID$-$Number%05d$.$ext$',
		'-method',
		'PUT',
		'-http_persistent',
		0,
		'-hls_playlist',
		0,
		'-streaming',
		1,
		'-adaptation_sets',
		'id=0,streams=v id=1,streams=a',
		'-index_correction',
		1,
		'-dash_segment_type',
		'auto',
		'-ignore_io_errors',
		0,
		'-lhls',
		0,
		'-ldash',
		0,
	];

	test('defaults (legacy emits booleans as numbers)', () => {
		expect(outputs('dash', { address: 'example.com/live/manifest.mpd' })).toEqual([
			{ address: 'https://example.com/live/manifest.mpd', options: defaults },
		]);
	});

	test('credentials are put into the address', () => {
		expect(outputs('dash', { protocol: 'http://', address: 'example.com/live/manifest.mpd', username: 'user', password: 'pass' })).toEqual([
			{ address: 'http://user:pass@example.com/live/manifest.mpd', options: defaults },
		]);
	});

	test('options', () => {
		const out = outputs('dash', { address: 'example.com/live/manifest.mpd', options: { ldash: true, target_latency: '3', seg_duration: '' } });
		expect(out[0]!.options).toEqual([...defaults.slice(0, 4), ...defaults.slice(6, -1), 1, '-target_latency', '3']);
	});
});

describe('other services', () => {
	test('datarheicore', () => {
		expect(
			outputs('datarheicore', { v2_address: 'rtmp://example.com/live/stream?token=abc' }, makeCtx({ ffmpeg: 6, video: ['h264', 'hevc', 'av1', 'vp9'] })),
		).toEqual([{ address: 'rtmp://example.com/live/stream?token=abc', options: ['-f', 'flv', '-rtmp_enhanced_codecs', 'hvc1,av01,vp09'] }]);
		expect(outputs('datarheicore', { v2_address: 'rtmp://example.com/live/stream' })).toEqual([
			{ address: 'rtmp://example.com/live/stream', options: ['-f', 'flv'] },
		]);
		expect(outputs('datarheicore', { v2_address: 'srt://example.com:6000?mode=caller&transtype=live&streamid=abc,mode:publish' })).toEqual([
			{ address: 'srt://example.com:6000?mode=caller&transtype=live&streamid=abc,mode:publish', options: ['-bsf:v', 'dump_extra', '-f', 'mpegts'] },
		]);
	});

	test('datarheicore migrates v1 settings', () => {
		const service = get('datarheicore');
		expect(
			service.init({ protocol: 'rtmp', base_url: 'example.com:1935', app_path: 'live', stream_name: 'stream', token: 'abc', srt_passphrase: '' }),
		).toEqual({
			v2_address: 'rtmp://example.com:1935/live/stream?token=abc',
			v2_protocol: 'rtmp',
			v2_host: 'example.com:1935',
			v2_stream_id: '/live/stream',
			v2_token: 'abc',
			v2_passphrase: '',
			protocol: 'rtmp',
			base_url: '',
			app_path: '',
			stream_name: '',
			token: '',
			srt_passphrase: '',
		});
		expect(
			service.init({ protocol: 'srt', base_url: 'example.com:6000', app_path: '', stream_name: 'stream', token: 'abc', srt_passphrase: 'secret' }),
		).toEqual({
			v2_address: 'srt://example.com:6000?mode=caller&transtype=live&streamid=#!:m=publish,r=stream,token=abc&passphrase=secret',
			v2_protocol: 'srt',
			v2_host: 'example.com:6000',
			v2_stream_id: '#!:m=publish,r=stream,token=abc',
			v2_token: '',
			v2_passphrase: 'secret',
			protocol: 'srt',
			base_url: '',
			app_path: '',
			stream_name: '',
			token: '',
			srt_passphrase: '',
		});
	});

	test('datarheicore handleChange parses the address', () => {
		const service = get('datarheicore');
		const ctx = makeCtx();

		let settings = service.handleChange!(service.init({}), 'v2_address', 'rtmps://example.com:1936/live/stream?token=abc', ctx);
		expect(settings).toMatchObject({
			v2_address: 'rtmps://example.com:1936/live/stream?token=abc',
			v2_protocol: 'rtmps',
			v2_host: 'example.com:1936',
			v2_stream_id: '/live/stream',
			v2_token: 'abc',
		});

		settings = service.handleChange!(
			service.init({}),
			'v2_address',
			'srt://example.com:6000?mode=caller&transtype=live&streamid=#!:m=publish,r=stream&passphrase=secret',
			ctx,
		);
		expect(settings).toMatchObject({ v2_protocol: 'srt', v2_host: 'example.com:6000', v2_stream_id: '#!:m=publish,r=stream', v2_passphrase: 'secret' });

		settings = service.handleChange!(settings, 'v2_address', 'foobar', ctx);
		expect(settings).toMatchObject({ v2_address: 'foobar', v2_protocol: '', v2_host: '', v2_token: '', v2_passphrase: '' });
	});

	test('twitter', () => {
		expect(outputs('twitter')).toEqual([]);
		expect(outputs('twitter', { stream_key: 'abc' })).toEqual([{ address: 'rtmps://de.pscp.tv:443/x/abc', options: ['-f', 'flv'] }]);
		const out = outputs('twitter', { mode: 'hls', region: 'va', stream_key: 'abc' });
		expect(out.length).toBe(1);
		// legacy doesn't put a separator between stream key and name
		expect(out[0]!.address).toBe('https://va.pscp.tv:443/x/abcUUID.m3u8');
		expect(out[0]!.options.slice(-2)).toEqual(['-hls_segment_filename', 'https://va.pscp.tv:443/x/abcUUID_%d.ts']);
	});

	test('nimotv yields [null] without a stream key (as legacy)', () => {
		expect(outputs('nimotv')).toEqual([null]);
		expect(outputs('nimotv', { stream_key: 'abc' })).toEqual([{ address: 'rtmp://txpush.rtmp.nimo.tv/live/abc', options: ['-f', 'flv'] }]);
		expect(outputs('nimotv', { stream_key: 'abc', lines: '2' })).toEqual([
			{ address: 'rtmp://162.62.215.16/txpush.rtmp.nimo.tv/live/abc', options: ['-f', 'flv'] },
		]);
	});

	test('rtsp', () => {
		expect(
			outputs('rtsp', {
				address: 'example.com:554/live',
				username: 'user',
				password: 'pass',
				options: { rtsp_transport: 'tcp', user_agent: 'restreamer' },
			}),
		).toEqual([
			{
				address: 'rtsp://user:pass@example.com:554/live',
				options: ['-f', 'rtsp', '-rtsp_transport', 'tcp', '-user-agent', 'restreamer', '-muxdelay', '0.1'],
			},
		]);
	});

	test('framebuffer', () => {
		expect(outputs('framebuffer', { device: '/dev/fb0' })).toEqual([{ address: '/dev/fb0', options: ['-pix_fmt', 'bgra', '-f', 'fbdev'] }]);
		const field = get('framebuffer').fields.find((f) => f.key === 'device')!;
		expect((field.options as any)({}, makeCtx())).toEqual([
			{ value: 'none', label: 'Choose an output device ...', disabled: true },
			{ value: '/dev/fb0', label: 'fb0 (vc4drmfb)' },
		]);
	});

	test('dummy', () => {
		expect(dummy.createOutput(dummy.init({ stream_key: 'abc', rtmp_backup: true }), makeCtx())).toEqual([
			{ address: 'rtmp://a.rtmp.youtube.com/live2/abc', options: ['-codec', 'copy', '-f', 'flv'] },
			{ address: 'rtmp://b.rtmp.youtube.com/live2?backup=1/abc', options: ['-codec', 'copy', '-f', 'flv'] },
		]);
	});
});
