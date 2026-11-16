// @ts-nocheck -- test double for the untyped port; see restreamer.test.ts.
// A fake datarhei-core: answers the API calls the core client makes and records them.
// Used by the golden tests (as a fetch replacement) and by scripts/dev/fake-core-server.ts
// (as a real HTTP server to develop the UI against).

export const ADDRESS = 'http://core.test:8080';
// ---------------------------------------------------------------------------------------------
// Fake datarhei-core

export const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
export const jwt = (usefor: string) => b64({ alg: 'HS256', typ: 'JWT' }) + '.' + b64({ sub: 'admin', usefor, exi: 600 }) + '.signature';
export const ACCESS_TOKEN = jwt('access');
export const REFRESH_TOKEN = jwt('refresh');

export const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
export const notFound = (message = 'Not found') => json({ code: 404, message, details: [] }, 404);

export const skillsResponse = (ffmpegVersion: string) => ({
	ffmpeg: { version: ffmpegVersion, compiler: 'gcc 13.2.1', configuration: '--enable-gpl', libraries: [] },
	filter: [
		{ id: 'aresample', name: 'Resample audio data.' },
		{ id: 'scale', name: 'Scale the input video size.' },
	],
	hwaccels: [{ id: 'vaapi', name: 'vaapi' }],
	codecs: {
		audio: [
			{ id: 'aac', name: 'AAC (Advanced Audio Coding)', encoders: ['aac'], decoders: ['aac', 'aac_fixed'] },
			{ id: 'mp3', name: 'MP3', encoders: ['libmp3lame'], decoders: ['mp3'] },
			{ id: 'ac3', name: 'ATSC A/52A (AC-3)', encoders: null, decoders: ['ac3'] },
		],
		video: [
			{ id: 'h264', name: 'H.264', encoders: ['libx264', 'h264_v4l2m2m'], decoders: ['h264'] },
			{ id: 'hevc', name: 'H.265', encoders: ['libx265'], decoders: ['hevc'] },
			{ id: 'mjpeg', name: 'Motion JPEG', encoders: ['mjpeg'], decoders: null },
		],
		subtitle: [],
	},
	formats: {
		demuxers: [
			{ id: 'hls', name: 'Apple HTTP Live Streaming' },
			{ id: 'flv', name: 'FLV' },
			{ id: 'mpegts', name: 'MPEG-TS' },
			{ id: 'rtsp', name: 'RTSP input' },
		],
		muxers: [
			{ id: 'hls', name: 'Apple HTTP Live Streaming' },
			{ id: 'flv', name: 'FLV' },
			{ id: 'mpegts', name: 'MPEG-TS' },
			{ id: 'tee', name: 'Multiple muxer tee' },
			{ id: 'dash', name: 'DASH Muxer' },
		],
	},
	protocols: {
		input: [{ id: 'http' }, { id: 'https' }, { id: 'rtmp' }, { id: 'rtmps' }, { id: 'srt' }, { id: 'rtsp' }],
		output: [{ id: 'http' }, { id: 'https' }, { id: 'rtmp' }, { id: 'rtmps' }, { id: 'srt' }],
	},
	devices: {
		demuxers: [
			{
				id: 'video4linux2',
				name: 'Video4Linux2 device grab',
				devices: [
					{ id: '/dev/video0', name: 'USB Camera', extra: 'usb-0000:00:14.0-1', media: 'video' },
					{ id: '/dev/video1', name: 'mmal service 16.1', extra: 'platform:bcm2835-v4l2-0', media: 'video' },
				],
			},
			{ id: 'alsa', name: 'ALSA audio input', devices: [{ id: 'hw:1,0', name: 'USB Audio', extra: '', media: 'audio' }] },
			{ id: 'lavfi', name: 'Libavfilter virtual input device', devices: [] },
		],
		muxers: [
			{ id: 'fbdev', name: 'Linux framebuffer', devices: [{ id: '/dev/fb0', name: 'fb0', extra: '', media: 'video' }] },
			{ id: 'alsa', name: 'ALSA audio output', devices: [] },
		],
	},
});

export const configResponse = (opts: CoreOptions) => ({
	created_at: '2026-01-02T03:04:05.123456789Z',
	loaded_at: '2026-01-02T03:04:06Z',
	updated_at: '2026-01-02T05:04:07+02:00',
	config: {
		version: 3,
		id: 'core-0001',
		name: 'fake-core',
		address: ':8080',
		host: { name: ['stream.example.com'], auto: false },
		api: {
			read_only: false,
			access: { http: { allow: ['10.0.0.0/8'], block: [] }, https: { allow: [], block: ['192.168.1.1/32'] } },
			auth: {
				enable: true,
				disable_localhost: false,
				username: 'admin',
				password: 'secret',
				jwt: { secret: 'jwt-secret' },
				auth0: { enable: false, tenants: [] },
			},
		},
		tls: { enable: false, auto: false, address: ':8181' },
		storage: {
			disk: { dir: '/core/data', max_size_mbytes: 0 },
			memory: { auth: { enable: opts.memfsAuth, username: 'mem user', password: 'p@ss/word' }, max_size_mbytes: 64, purge: true },
			s3: [
				{
					name: 's3',
					mountpoint: '/s3',
					auth: { enable: true, username: 'u', password: 'p' },
					endpoint: 's3.example.com',
					access_key_id: 'AKIA',
					secret_access_key: 'sk',
				},
			],
			cors: { origins: ['https://player.example.com'] },
			mimetypes_file: './mime.types',
		},
		rtmp: { enable: opts.rtmp, enable_tls: false, address: ':1935', address_tls: ':1936', app: '/', token: opts.rtmpToken },
		srt: { enable: opts.srt, address: ':6000', passphrase: opts.srtPassphrase, token: opts.srtToken },
		ffmpeg: { binary: '/usr/local/bin/ffmpeg', max_processes: 0 },
		service: { enable: false, token: 'service-token', url: 'https://service.datarhei.com' },
		sessions: { enable: true, ip_ignorelist: ['127.0.0.1/32', '::1/128'] },
	},
	overrides: ['rtmp.enable', 'storage.memory.purge'],
});

// The UI's own static assets (legacy: public/_player, public/_playersite). Small stand-ins that use
// the same template variables/helpers as the real files.
export const localAssets: Record<string, string> = {
	'/_player/videojs/files.txt': 'dist/video.min.js\ndist/video-js.min.css\n',
	'/_player/videojs/dist/video.min.js': '/* video.js */',
	'/_player/videojs/dist/video-js.min.css': '/* video.js css */',
	'/_player/videojs/player.html': [
		'<title>{{name}}</title>',
		'<meta name="description" content="{{description}}" />',
		'<meta name="author" content="{{author_name}}" />',
		'<meta property="og:image" content="{{poster_url}}" />',
		'<link rel="alternate" type="application/json+oembed" href="channels/{{channelid}}/oembed.json" />',
		'<script src="channels/{{channelid}}/config.js"></script>',
		'<video poster="{{poster}}" width="{{width}}" height="{{height}}"></video>',
		'{{#if chromecast}}<script src="cast_sender.js"></script>{{/if}}',
		'{{#if airplay}}<script src="airplay.js"></script>{{/if}}',
		'<!-- {{license}} {{author_url}} {{{iframecode}}} -->',
	].join('\n'),
	'/_player/oembed.json.in':
		'{"version":"1.0","type":"video","title":{{{name}}},"description":{{{description}}},"author_name":{{{author_name}}},"author_url":{{{author_url}}},"license":{{{license}}},"html":{{{iframecode}}},"width":{{width}},"height":{{height}},"thumbnail_url":{{{poster_url}}},"poster":{{{poster}}} }',
	'/_player/oembed.xml.in':
		'<oembed><title>{{name}}</title><author_name>{{author_name}}</author_name><html>{{iframecode}}</html><thumbnail_url>{{poster_url}}</thumbnail_url></oembed>',
	'/_playersite/index.html': [
		'<title>{{title}}</title>',
		'<style>body{color:{{textcolor_default}} ;background:{{bgcolor_default}} url("{{bgimage_url}}") }h1{color:{{textcolor_title}} }a{color:{{textcolor_link}} }a:hover{color:{{textcolor_link_hover}} }hr{color:{{hrcolor}} }header{background:{{bgcolor_header}} }</style>',
		'{{{inject1}}}',
		'<h1>{{channel_name}}</h1><p>{{{channel_description_html}}}</p><p>{{channel_creator_name}}: {{{channel_creator_description_html}}}</p>',
		'<video data-player="{{player}}" data-channel="{{channel_id}}" poster="{{channel_poster}}" width="{{channel_width}}" height="{{channel_height}}"></video>',
		'<ul>{{#each channels}}<li class="{{#ifEquals channelid ../channel_id}}selected{{else}}unselected{{/ifEquals}}">{{#ifnoteq channelid ../channel_id}}<a href="playersite_{{channelid}}.html">{{name}}</a>{{else}}{{name}}{{/ifnoteq}}</li>{{/each}}</ul>',
		'{{#if share}}<a href="{{url}}">share</a>{{/if}}{{#if support}}<a>support</a>{{/if}}{{#if chromecast}}cast{{/if}}{{#if airplay}}airplay{{/if}}',
		'<footer>{{channel_license}} {{{imprint_html}}} {{{terms_html}}}</footer>',
		'{{{inject2}}}{{{inject3}}}{{{inject4}}}',
	].join('\n'),
	'/_playersite/bg.jpg': 'JPEG',
	'/_playersite/videojs.js': '/* playersite videojs glue */',
	'/robots.txt': 'User-agent: *\nDisallow: /\n',
	'/favicon.ico': 'ICO',
	'/logo192.png': 'PNG192',
	'/logo512.png': 'PNG512',
};

export interface CoreOptions {
	ffmpeg: string;
	coreVersion: string;
	rtmp: boolean;
	srt: boolean;
	rtmpToken: string;
	srtToken: string;
	srtPassphrase: string;
	memfsAuth: boolean;
	processes: any[];
}

export interface Recorded {
	method: string;
	path: string;
	body?: unknown;
}

export class FakeCore {
	opts: CoreOptions;
	requests: Recorded[] = [];
	unhandled: string[] = [];
	processes = new Map<string, any>();
	metadata = new Map<string, unknown>();
	disk = new Map<string, string>();
	mem = new Map<string, string>();
	serviceResponse: unknown = { latest_version: 'restreamer-v2.12.0', service_version: 'v0.0.0' };

	constructor(opts: Partial<CoreOptions> = {}) {
		this.opts = {
			ffmpeg: '6.1.1',
			coreVersion: '16.16.0',
			rtmp: true,
			srt: true,
			rtmpToken: '',
			srtToken: '',
			srtPassphrase: '',
			memfsAuth: false,
			processes: [],
			...opts,
		};

		for (const p of this.opts.processes) {
			this.processes.set(p.id, JSON.parse(JSON.stringify(p)));
		}
	}

	install() {
		globalThis.fetch = ((input: any, init?: any) => this.fetch(String(input), init ?? {})) as typeof fetch;
	}

	// Requests to /api/v3/process* (the generated process configs), in order.
	processRequests(from = 0): Recorded[] {
		return this.requests
			.slice(from)
			.filter((r) => r.method !== 'GET' && /^\/api\/v3\/process(\/|$)/.test(r.path) && !/\/(metadata|command)(\/|$)/.test(r.path));
	}

	// Uploads to the disk filesystem, in order.
	uploads(from = 0): Recorded[] {
		return this.requests.slice(from).filter((r) => r.method !== 'GET' && r.method !== 'HEAD' && r.path.startsWith('/api/v3/fs/disk'));
	}

	async fetch(url: string, init: any): Promise<Response> {
		const method = (init.method || 'GET').toUpperCase();

		if (url === 'https://service.datarhei.com/api/v1/app_version') {
			this.requests.push({ method, path: url, body: JSON.parse(init.body) });
			return json(this.serviceResponse);
		}

		if (!url.startsWith(ADDRESS)) {
			// The UI's own static assets, fetched relative to the page.
			const asset = localAssets[url.replace(/^\.\//, '')];
			this.requests.push({ method, path: url });
			if (asset === undefined) {
				this.unhandled.push(`${method} ${url}`);
				return new Response('not found', { status: 404 });
			}

			return new Response(asset);
		}

		const u = new URL(url);
		const path = decodeURIComponent(u.pathname);
		const record: Recorded = { method, path: path + u.search };

		if (init.body !== undefined && init.body !== null) {
			const text = typeof init.body === 'string' ? init.body : await new Response(init.body).text();
			const contentType = init.headers?.['Content-Type'] ?? '';
			record.body = contentType.includes('application/json') ? JSON.parse(text) : text;
		}

		this.requests.push(record);

		const authorized = init.headers?.Authorization === 'Bearer ' + ACCESS_TOKEN;

		if (path === '/api') {
			if (!authorized) {
				return json({ app: 'datarhei-core', auths: ['localjwt'], name: '', id: '', created_at: '', uptime_seconds: 0, version: { number: '' } });
			}

			return json({
				app: 'datarhei-core',
				auths: ['localjwt', 'auth0 domain=example.eu.auth0.com'],
				name: 'fake-core',
				id: 'core-0001',
				created_at: '2026-01-02T03:04:05Z',
				uptime_seconds: 42,
				version: {
					number: this.opts.coreVersion,
					repository_commit: 'abcdef',
					build_date: '2026-01-01T00:00:00Z',
					arch: 'linux/amd64',
					compiler: 'go1.22',
				},
			});
		}

		if (path === '/api/login' && method === 'POST') {
			const body = record.body as { username: string; password: string } | undefined;
			if (body?.username === 'admin' && body?.password === 'secret') {
				return json({ access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN });
			}

			return json({ code: 401, message: 'Invalid username or password', details: [] }, 401);
		}

		if (path === '/api/login/refresh') {
			if (init.headers?.Authorization === 'Bearer ' + REFRESH_TOKEN) {
				return json({ access_token: ACCESS_TOKEN });
			}

			return json({ code: 401, message: 'Invalid token', details: [] }, 401);
		}

		if (!authorized) {
			return json({ code: 401, message: 'Missing or invalid JWT token', details: [] }, 401);
		}

		const v3 = path.replace(/^\/api\/v3/, '');
		let m: RegExpMatchArray | null;

		if (v3 === '/skills' || v3 === '/skills/reload') {
			return json(skillsResponse(this.opts.ffmpeg));
		}

		if (v3 === '/config' && method === 'GET') {
			return json(configResponse(this.opts));
		}

		if (v3 === '/rtmp') {
			return json([]);
		}

		if (v3 === '/srt') {
			return json({ publisher: {}, subscriber: {}, connections: {}, log: {} });
		}

		if ((m = v3.match(/^\/metadata\/(.+)$/))) {
			if (method === 'PUT') {
				this.metadata.set(m[1], record.body);
				return json(record.body);
			}

			return this.metadata.has(m[1]) ? json(this.metadata.get(m[1])) : notFound('Unknown key');
		}

		if (v3 === '/process' && method === 'GET') {
			const reference = u.searchParams.get('reference');
			const list = [...this.processes.values()].filter((p) => !reference || p.reference === reference);
			return json(list.map((p) => JSON.parse(JSON.stringify(p))));
		}

		if (v3 === '/process' && method === 'POST') {
			const config = record.body as any;
			this.processes.set(config.id, { id: config.id, reference: config.reference, config, metadata: {} });
			return json(config);
		}

		if ((m = v3.match(/^\/process\/([^/]+)\/metadata\/([^/]+)$/))) {
			const proc = this.processes.get(m[1]);
			if (!proc) {
				return notFound('Unknown process ID');
			}

			if (method === 'PUT') {
				proc.metadata[m[2]] = record.body;
				return json(record.body);
			}

			return m[2] in proc.metadata ? json(proc.metadata[m[2]]) : notFound('Unknown key');
		}

		if ((m = v3.match(/^\/process\/([^/]+)\/probe$/))) {
			return json({
				streams: [
					{ url: 'input', format: 'rtsp', index: 0, stream: 0, type: 'video', codec: 'h264', width: 1920, height: 1080 },
					{ url: 'input', format: 'rtsp', index: 0, stream: 1, type: 'audio', codec: 'aac', sampling_hz: 48000, layout: 'stereo', channels: 2 },
				],
				log: [],
			});
		}

		if ((m = v3.match(/^\/process\/([^/]+)\/command$/))) {
			const proc = this.processes.get(m[1]);
			if (!proc) {
				return notFound('Unknown process ID');
			}

			const command = (record.body as any)?.command;
			if (command === 'start' || command === 'stop') {
				proc.order = command;
				proc.startedAt = command === 'start' ? Date.now() : null;
			}

			return json('OK');
		}

		// A started process "runs": enough for the UI to show a connected channel.
		if ((m = v3.match(/^\/process\/([^/]+)\/state$/))) {
			const proc = this.processes.get(m[1]);
			if (!proc) {
				return notFound('Unknown process ID');
			}

			const running = proc.order === 'start';
			const runtime = running ? Math.floor((Date.now() - (proc.startedAt ?? Date.now())) / 1000) : 0;

			return json({
				order: running ? 'start' : 'stop',
				exec: running ? 'running' : 'finished',
				runtime_seconds: runtime,
				reconnect_seconds: -1,
				last_logline: '',
				memory_bytes: running ? 64 * 1024 * 1024 : 0,
				cpu_usage: running ? 3.5 : 0,
				command: ['-i', proc.config?.input?.[0]?.address ?? '', '-f', 'null', '-'],
				progress: {
					fps: running ? 25 : 0,
					bitrate_kbit: running ? 4096 : 0,
					speed: running ? 1 : 0,
					quality: -1,
					frames: runtime * 25,
					drop: 0,
					dup: 0,
				},
			});
		}

		if ((m = v3.match(/^\/process\/([^/]+)\/report$/))) {
			if (!this.processes.has(m[1])) {
				return notFound('Unknown process ID');
			}

			return json({
				created_at: 1763280000,
				prelude: ['ffmpeg version 6.1.1-datarhei', '  built with gcc 13.2.1'],
				log: [
					['1763280000', '[info] ffmpeg version 6.1.1-datarhei'],
					['1763280001', '[info] Input #0, rtsp'],
				],
			});
		}

		if ((m = v3.match(/^\/process\/([^/]+)$/))) {
			const proc = this.processes.get(m[1]);
			if (!proc) {
				return notFound('Unknown process ID');
			}

			if (method === 'PUT') {
				const config = record.body as any;
				proc.config = config;
				return json(config);
			}

			if (method === 'DELETE') {
				this.processes.delete(m[1]);
				return json('OK');
			}

			return json(JSON.parse(JSON.stringify(proc)));
		}

		if (v3 === '/fs/disk' && method === 'GET') {
			return json([...this.disk.keys()].map((name) => ({ name, size_bytes: this.disk.get(name)!.length, last_modified: 0 })));
		}

		if ((m = v3.match(/^\/fs\/(disk|mem)(\/.+)$/))) {
			const fs = m[1] === 'disk' ? this.disk : this.mem;
			if (method === 'PUT') {
				fs.set(m[2], record.body as string);
				return new Response(m[2], { status: 201 });
			}

			if (!fs.has(m[2])) {
				return new Response('File not found', { status: 404 });
			}

			if (method === 'DELETE') {
				fs.delete(m[2]);
				return new Response('OK');
			}

			return new Response(method === 'HEAD' ? null : fs.get(m[2])!);
		}

		if (v3 === '/metrics' && method === 'POST') {
			const metric = (name: string, value: number, labels: Record<string, string> = {}) => ({ name, labels, values: [[1700000000, value]] });
			return json({
				metrics: [
					metric('uptime_uptime', 3600),
					metric('cpu_ncpu', 4),
					metric('cpu_idle', 87.5),
					metric('mem_total', 8000),
					metric('mem_free', 3000),
					metric('filesystem_limit', 64000, { name: 'memfs' }),
					metric('filesystem_usage', 1000, { name: 'memfs' }),
					metric('filesystem_limit', 0, { name: 'diskfs' }),
					metric('filesystem_usage', 500, { name: 'diskfs' }),
					metric('session_limit', 100, { collector: 'hls' }),
					metric('session_active', 3, { collector: 'hls' }),
					metric('session_txbitrate', 2048, { collector: 'hls' }),
					metric('session_maxtxbitrate', 10240, { collector: 'hls' }),
					metric('session_active', 9, { collector: 'rtmp' }),
				],
			});
		}

		if (v3.startsWith('/session/active')) {
			return json({
				hls: [
					{ reference: this.sessionReference + '.m3u8', bandwidth_tx_kbit: 1500 },
					{ reference: this.sessionReference + '.m3u8', bandwidth_tx_kbit: 0 },
					{ reference: 'other', bandwidth_tx_kbit: 900 },
				],
				ffmpeg: [{ reference: this.sessionReference, bandwidth_tx_kbit: 4000 }],
			});
		}

		if (v3 === '/log') {
			return json(['line 1', 'line 2']);
		}

		this.unhandled.push(`${method} ${record.path}`);
		return notFound();
	}

	sessionReference = '';
}
