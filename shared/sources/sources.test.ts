// Parity: the source logic in shared/sources must produce exactly what the legacy React modules
// (legacy/src/views/Edit/Sources, legacy/src/views/Edit/Wizard/Sources, SourceSelect.js) produce.
//
// The editor sources export their logic through `func` and are compared directly. Logic that lives
// inside a legacy component (the change handler of the network form, the wizard forms, the source
// list of SourceSelect) is reached by calling the component as a plain function under a stub hook
// dispatcher (withHooks) and invoking the handlers found in the returned element tree.
import { describe, expect, test } from 'bun:test';

import Sources, * as Registry from './index';
import * as Framebuffer from './framebuffer';
import * as Network from './network';
import { checkUpload } from './options';
import WizardSources, * as Wizard from './wizard';
import * as InternalHLS from './wizard/internalhls';
import type { WizardSource } from './wizard';

// @ts-expect-error the legacy React is installed without type declarations
import React from '../../legacy/node_modules/react';
import LegacySources from '../../legacy/src/views/Edit/Sources';
import * as LegacyFramebuffer from '../../legacy/src/views/Edit/Sources/Framebuffer';
import LegacySourceSelect from '../../legacy/src/views/Edit/SourceSelect';
import LegacyWizardSources from '../../legacy/src/views/Edit/Wizard/Sources';
import * as LegacyInternalHLS from '../../legacy/src/views/Edit/Wizard/Sources/InternalHLS';

/* eslint-disable @typescript-eslint/no-explicit-any */

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

// The value or the kind of error of a call, so that "both throw the same" counts as equal.
function outcome(fn: () => unknown): { value?: unknown; throws?: string } {
	try {
		return { value: fn() };
	} catch (e) {
		return { throws: (e as Error)?.constructor?.name ?? 'unknown' };
	}
}

// Runs `fn` with React hooks usable outside of a render. Effects run immediately if `effects` is set.
const internals = (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
const stubContext = { i18n: { _: (x: unknown) => x }, navigator: {}, basename: '', location: { pathname: '/' }, matches: [], outlet: null, future: {} };

function withHooks<T>(fn: () => T, effects = true): T {
	const previous = internals.ReactCurrentDispatcher.current;
	const run = (f: () => void) => {
		if (effects) f();
	};
	internals.ReactCurrentDispatcher.current = {
		useContext: (ctx: any) => ctx._currentValue ?? stubContext,
		useEffect: run,
		useLayoutEffect: run,
		useInsertionEffect: run,
		useState: (i: unknown) => [typeof i === 'function' ? i() : i, () => {}],
		useReducer: (_r: unknown, a: unknown, init?: (a: unknown) => unknown) => [init ? init(a) : a, () => {}],
		useMemo: (f: () => unknown) => f(),
		useCallback: (f: unknown) => f,
		useRef: (v: unknown) => ({ current: v }),
		useDebugValue: () => {},
	};
	try {
		return fn();
	} finally {
		internals.ReactCurrentDispatcher.current = previous;
	}
}

// The text of a legacy label: a string or a <Trans> element.
const text = (node: any): string => (typeof node === 'string' ? node : typeof node?.props?.children === 'string' ? node.props.children : '');

// All elements of a legacy element tree that have a change handler, by label.
function handlers(node: any, out: Record<string, (event: unknown) => void> = {}) {
	if (Array.isArray(node)) {
		node.forEach((child) => handlers(child, out));
	} else if (node && typeof node === 'object' && node.props) {
		if (typeof node.props.onChange === 'function' && text(node.props.label).length !== 0) {
			out[text(node.props.label)] = node.props.onChange;
		}
		handlers(node.props.children, out);
	}
	return out;
}

const ff = (major: number, minor: number, extra: Record<string, unknown> = {}) => ({
	ffmpeg: { version: `${major}.${minor}.1`, version_major: major, version_minor: minor },
	formats: { demuxers: ['rtsp'] },
	protocols: { input: ['http', 'https', 'rtmp', 'rtmps', 'srt'] },
	...extra,
});

// The skills of legacy/src/views/Edit/Sources/Network.test.js
const skills4 = { ...ff(4, 4), ffmpeg: { version: '4.4.1', version_major: 4, version_minor: 4 } };
const skills5 = { ...ff(5, 1), ffmpeg: { version: '5.1.2', version_major: 5, version_minor: 1 } };
const skills6 = {
	...ff(6, 1),
	codecs: { audio: {}, video: { av1: ['librav1e'], hevc: ['hevc'], vp9: ['libvpx-vp9'] } },
};

const skillsMatrix = [
	undefined,
	{},
	skills4,
	skills5,
	skills6,
	// no codecs: an RTMP input throws with ffmpeg >= 6
	ff(6, 1),
	ff(7, 1, { codecs: { audio: {}, video: { hevc: ['hevc_nvenc'], av1: [], h264: ['libx264'] } } }),
	ff(5, 0, { protocols: { input: ['tls', 'udp', 'rtp', 'file'] } }),
	{ ffmpeg: { version: '4.1.0', version_major: 4, version_minor: 1 }, protocols: { input: ['rtsp', 'http', 'mmsh', 'ftp', 'icecast'] } },
];

// The config of legacy/src/views/Edit/Sources/Network.test.js
const testConfig = {
	channelid: 'external',
	rtmp: { enabled: true, app: '/live', token: 'foobar' },
	srt: { enabled: true, token: 'foobar', passphrase: 'bazfoobazfoo' },
};

const configMatrix = [
	undefined,
	{},
	testConfig,
	{
		channelid: 'abc',
		rtmp: { enabled: true, secure: true, host: 'example.com:1936', local: '127.0.0.1:1935', app: '/app', token: 'tok en/&?' },
		srt: { enabled: true, host: 'example.com:6000', local: '127.0.0.1:6000', token: 't k,n', passphrase: 'pass phrase&=' },
		hls: { secure: true, host: 'example.com', local: '127.0.0.1:8080', credentials: 'user:pass' },
	},
	{ rtmp: { enabled: true }, srt: { enabled: false }, hls: { host: '[::1]:8080' } },
];

const addresses = [
	'',
	'rtsp://127.0.0.1/live/stream',
	'rtsps://cam.local:322/h264',
	'rtsp://user:secret@cam.local/stream?x=1',
	'rtmp://127.0.0.1/live/stream',
	'rtmps://example.com:443/app/key',
	'rtmpe://example.com/app',
	'rtmpt://example.com/app',
	'http://127.0.0.1/live/stream.m3u8',
	'https://example.com:8443/a/b.mpd?token=1&x=y',
	'HTTP://EXAMPLE.com/Stream.M3U8',
	'srt://127.0.0.1?mode=caller&streamid=foobar',
	'udp://239.0.0.1:1234',
	'rtp://239.0.0.1:5004',
	'tcp://10.0.0.1:9000',
	'mmsh://example.com/stream',
	'mmst://example.com/stream',
	'ftp://example.com/video.mp4',
	'sftp://example.com/video.mp4',
	'icecast://example.com:8000/mount',
	'amqp://example.com/queue',
	'file:///tmp/video.mp4',
	'shttp://example.com/x',
	'x-rtsp.v2+tls://example.com/x',
	'/dev/video0',
	'example.com/stream',
	'1http://example.com',
	'://nothing',
];

const pullOptions = [
	{},
	{ rtsp: { udp: true, stimeout: '123456' } },
	{
		http: {
			readNative: false,
			forceFramerate: true,
			framerate: '30',
			userAgent: 'foobaz/1',
			referer: 'http://example.com',
			http_proxy: 'https://1.2.3.4:443',
		},
	},
	{ http: { forceFramerate: true } },
	{ general: { fflags: [] } },
	{
		general: {
			fflags: ['discardcorrupt', 'genpts', 'nobuffer'],
			thread_queue_size: '1024',
			probesize: '32',
			max_probe_packets: 5000,
			copyts: true,
			start_at_zero: true,
			use_wallclock_as_timestamps: true,
			avoid_negative_ts: 'make_zero',
			analyzeduration: '1000000',
			analyzeduration_rtmp: '2000000',
			analyzeduration_http: '3000000',
		},
	},
	// typed into the form, the default is a string and no longer equals 2500
	{ general: { max_probe_packets: '2500', avoid_negative_ts: 'disabled' } },
];

const credentials = [{}, { username: 'admin', password: 'foobar' }, { username: 'admin' }, { password: 'p@ss:w/rd' }];

function networkSettingsMatrix(): any[] {
	const matrix: any[] = [undefined, null, {}];

	for (const address of addresses) {
		for (const auth of credentials) {
			matrix.push({ mode: 'pull', address, ...auth });
		}
	}
	for (const address of ['rtsp://127.0.0.1/live/stream', 'rtmp://127.0.0.1/live/stream', 'http://127.0.0.1/live/stream.m3u8', 'udp://239.0.0.1:1234']) {
		for (const options of pullOptions) {
			matrix.push({ mode: 'pull', address, username: 'admin', password: 'foobar', ...options });
		}
	}
	for (const type of ['rtmp', 'srt', 'hls', '', 'udp']) {
		for (const name of [undefined, 'external', 'abc', 'none', 'other.stream']) {
			for (const options of [{}, pullOptions[5]]) {
				matrix.push({ mode: 'push', address: 'rtsp://ignored/in/push', push: name === undefined ? { type } : { type, name }, ...options });
			}
		}
	}
	matrix.push({ mode: 'push' }, { mode: 'something' });

	return matrix;
}

const deviceSettings: Record<string, any[]> = {
	alsa: [undefined, {}, { device: '0,0', sampling: '48000', channels: '2', delay: 250 }, { device: 'custom', delay: '0' }, { address: 'hw:9,9', delay: -40 }],
	avfoundation: [
		undefined,
		{},
		{ vindex: '1', aindex: 'none', format: 'yuv420p', framerate: '30', size: '1280x720', cursor: true, clicks: true },
		{ framerate: '0', format: '', size: '' },
		{ framerate: 0, cursor: true },
		{ framerate: 'abc', size: 'auto', clicks: true },
	],
	video4linux2: [
		undefined,
		{},
		{ device: '/dev/video0' },
		{ device: '/dev/video1', format: 'mjpeg', framerate: '30', size: '1920x1080' },
		{ device: 'custom', deviceCustom: '/dev/video7' },
		{ device: 'none', deviceCustom: '/dev/video8', framerate: 15 },
	],
	raspicam: [
		undefined,
		{},
		{ device: '/dev/video0' },
		{ device: '/dev/video1', format: 'h264', framerate: '30', size: '1280x720' },
		{ device: 'custom', deviceCustom: '/dev/video7' },
	],
	fbdev: [undefined, {}, { device: '/dev/fb0', framerate: '30' }, { device: 'custom', deviceCustom: '/dev/fb1' }, { device: 'none' }],
	virtualaudio: [
		undefined,
		{},
		{ source: 'silence', sampling: '48000', layout: 'mono' },
		{ source: 'noise', color: 'pink', amplitude: '0.5' },
		{ source: 'noise' },
		{ source: 'sine', frequency: '1000', beepfactor: '2', sampling: '22050' },
		{ source: 'sine' },
		{ source: 'unknown' },
	],
	virtualvideo: [
		undefined,
		{},
		...['none', 'testsrc', 'testsrc2', 'pal75bars', 'pal100bars', 'rgbtestsrc', 'smptebars', 'smptehdbars', 'yuvtestsrc', 'life', 'unknown'].flatMap(
			(source) => [
				{ source },
				{ source, fps: '30', size: '1280x720' },
				{
					source,
					fps: '50',
					size: '640x360',
					scale: '1280x720',
					rule: 'S14/B34',
					ratio: '1/3',
					mold: '5',
					death_color: '#000000',
					life_color: '#FFFFFF',
					flags: 'bicubic',
				},
			],
		),
	],
	noaudio: [undefined, {}, { anything: 1 }],
	videoaudio: [undefined, {}, { anything: 1 }],
	videoloop: [
		undefined,
		{},
		{ address: '/channels/abc/videoloop.source', mimetype: 'image/*' },
		{ address: '/channels/abc/videoloop.source', mimetype: 'video/*' },
		{ address: '/x', mimetype: 'image/png' },
		{ address: '/x' },
	],
	audioloop: [undefined, {}, { address: '/channels/abc/audioloop.source', mimetype: 'audio/*' }, { address: '/x' }],
};

// Compares init + createInputs of a ported and a legacy source module over the matrix. Returns how many inputs were created.
function compareSource(ported: any, legacy: any, settingsMatrix: any[], configs: any[], skills: any[]): number {
	let created = 0;

	for (const settings of settingsMatrix) {
		for (const config of configs) {
			const a = outcome(() => ported.func.initSettings(clone(settings), ported.func.initConfig ? ported.func.initConfig(clone(config)) : undefined));
			const b = outcome(() => legacy.func.initSettings(clone(settings), legacy.func.initConfig ? legacy.func.initConfig(clone(config)) : undefined));
			expect(a).toEqual(b);

			for (const s of skills) {
				// raw settings (createInputs of the network source initializes them itself) and initialized settings
				for (const input of [settings, b.value]) {
					const ia = outcome(() => ported.func.createInputs(clone(input), clone(config), clone(s)));
					const ib = outcome(() => legacy.func.createInputs(clone(input), clone(config), clone(s)));
					expect(ia).toEqual(ib);
					if (ib.value !== undefined) created++;
				}
			}
		}
	}

	return created;
}

function compareMeta(ported: any, legacy: any) {
	expect(ported.id).toBe(legacy.id);
	expect(ported.name).toBe(text(legacy.name));
	expect(ported.name.length).toBeGreaterThan(0);
	expect(ported.capabilities).toEqual(legacy.capabilities);
	expect(ported.ffversion).toBe(legacy.ffversion);
	expect(ported.type).toBe(legacy.type);
	expect(ported.icon).toMatch(/^i-lucide-[a-z0-9-]+$/);
	if (legacy.func) {
		expect(Object.keys(ported.func).sort()).toEqual(Object.keys(legacy.func).sort());
	}
}

describe('editor sources', () => {
	test('registers the legacy sources in the same order, followed by the playlist source (not in legacy)', () => {
		expect(LegacySources.IDs().length).toBe(11);
		expect(Sources.IDs()).toEqual([...LegacySources.IDs(), 'playlist']);
		expect(Sources.List().map((s) => s.id)).toEqual([...LegacySources.List().map((s: any) => s.id), 'playlist']);
		expect(Sources.Get('nope')).toBe(LegacySources.Get('nope'));
	});

	for (const id of LegacySources.IDs().filter((id: string) => id !== 'network')) {
		test(id, () => {
			const ported = Sources.Get(id);
			const legacy = LegacySources.Get(id);
			expect(ported).not.toBeNull();
			compareMeta(ported, legacy);

			expect(deviceSettings[id]!.length).toBeGreaterThan(2);
			const created = compareSource(ported, legacy, deviceSettings[id]!, [undefined], [undefined, skills5]);
			expect(created).toBeGreaterThan(deviceSettings[id]!.length);
		});
	}

	test('fbdev (not registered, as in legacy)', () => {
		expect(LegacySources.Get('fbdev')).toBeNull();
		expect(Sources.Get('fbdev')).toBeNull();
		compareMeta(Framebuffer, LegacyFramebuffer);
		expect(compareSource(Framebuffer, LegacyFramebuffer, deviceSettings.fbdev!, [undefined], [undefined])).toBeGreaterThan(4);
	});
});

describe('network source', () => {
	const legacy = LegacySources.Get('network');

	test('meta', () => {
		compareMeta(Sources.Get('network'), legacy);
		expect(Sources.Get('network')!.func).toBe(Network.func);
	});

	test('settings x config x skills', () => {
		const settings = networkSettingsMatrix();
		expect(settings.length).toBeGreaterThan(190);

		const created = compareSource(Network, legacy, settings, configMatrix, skillsMatrix);
		// most combinations create an input; the rest throws alike (HLS push, RTMP with ffmpeg >= 6 without codecs)
		expect(created).toBeGreaterThan(settings.length * configMatrix.length * skillsMatrix.length);
	});

	test('initConfig, initSkills and the public addresses', () => {
		for (const config of configMatrix) {
			const a = Network.func.initConfig(clone(config));
			const b = legacy.func.initConfig(clone(config));
			expect(a).toEqual(b);

			for (const name of [undefined, 'none', 'other']) {
				expect(Network.func.getHLS(a, name)).toBe(legacy.func.getHLS(b, name));
				expect(Network.func.getRTMP(a, name)).toBe(legacy.func.getRTMP(b, name));
				expect(Network.func.getSRT(a, name)).toBe(legacy.func.getSRT(b, name));
			}
		}

		expect(Network.getRTMP(Network.initConfig(configMatrix[3]))).toBe('rtmps://example.com:1936/app/abc.stream/tok%20en%2F%26%3F');
		expect(Network.getSRT(Network.initConfig(testConfig))).toBe(
			'srt://localhost?mode=caller&transtype=live&streamid=external.stream,mode:publish,token:foobar&passphrase=bazfoobazfoo',
		);

		for (const skills of skillsMatrix) {
			// the given protocols.input array is extended in place by both
			const sa = clone(skills);
			const sb = clone(skills);
			expect(Network.func.initSkills(sa)).toEqual(legacy.func.initSkills(sb));
			expect(sa).toEqual(sb);
		}
	});

	test('protocol helpers', () => {
		const supported = [[], ['rtsp'], ['http', 'https', 'rtmp', 'rtmps', 'srt'], ['HTTP', 'udp', 'file', 'mmsh']];

		for (const url of [...addresses, 'rtmp://', 'srt://', 'http://', undefined, null, 5, {}]) {
			expect(Network.func.getProtocolClass(url)).toBe(legacy.func.getProtocolClass(url));
			expect(Network.func.isValidURL(url)).toBe(legacy.func.isValidURL(url));
			expect(Network.func.isAuthProtocol(url)).toBe(legacy.func.isAuthProtocol(url));

			for (const protocols of supported) {
				expect(outcome(() => Network.func.isSupportedProtocol(url as string, protocols))).toEqual(
					outcome(() => legacy.func.isSupportedProtocol(url, protocols)),
				);
			}
		}

		expect(Network.getProtocolClass('rtmps://example.com/app')).toBe('rtmp');
		expect(Network.getProtocolClass('https://example.com')).toBe('http');
		expect(Network.getProtocolClass('rtsps://example.com')).toBe('rtsp');
		expect(Network.getProtocolClass('mmsh://example.com')).toBe('mms');
		expect(Network.getProtocolClass('srt://example.com')).toBe('srt');
		expect(Network.getProtocolClass('example.com')).toBe('');
		expect(Network.isAuthProtocol('srt://example.com')).toBe(false);
		expect(Network.isAuthProtocol('rtsp://example.com')).toBe(true);
	});

	// legacy handleChange and handleProbe of the form, reached through the props of the <Pull>/<Push> element
	function legacyForm(settings: any, config: any, skills: any) {
		const calls: { change?: any; probe?: any[] } = {};
		const tree: any = withHooks(
			() =>
				legacy.component({
					settings: clone(settings),
					config: clone(config),
					skills: clone(skills),
					knownDevices: [],
					onChange: (s: any) => (calls.change = s),
					onProbe: (...args: any[]) => (calls.probe = args),
					onRefresh: () => {},
				}),
			false,
		);
		const form = tree.props.children[1];

		return { form, calls, mode: handlers(tree)['Pull or recieve the data:']! };
	}

	test('form changes (legacy handleChange)', () => {
		const steps: [string, string, unknown?][] = [
			['', 'address', 'rtsp://127.0.0.1/live/stream'],
			['', 'username', 'admin'],
			['', 'password', 'foobar'],
			['rtsp', 'udp'],
			['rtsp', 'stimeout', '1000000'],
			['rtsp', 'udp', 'ignored'],
			['http', 'readNative'],
			['http', 'forceFramerate'],
			['http', 'framerate', '30'],
			['http', 'userAgent', 'foobaz/1'],
			['http', 'referer', 'http://example.com'],
			['http', 'http_proxy', 'https://1.2.3.4:443'],
			['general', 'thread_queue_size', '1024'],
			['general', 'probesize', '32'],
			['general', 'max_probe_packets', '5000'],
			['general', 'analyzeduration', '1'],
			['general', 'analyzeduration_rtmp', '2'],
			['general', 'analyzeduration_http', '3'],
			['general', 'fflags', ['genpts', 'nobuffer']],
			['general', 'copyts'],
			['general', 'start_at_zero'],
			['general', 'use_wallclock_as_timestamps'],
			['general', 'avoid_negative_ts', 'make_zero'],
			['', 'mode', 'push'],
			['push', 'name', 'none'],
			['push', 'type', 'srt'],
			['push', 'name', 'other.stream'],
			['push', 'type', 'rtmp'],
			['', 'mode', 'pull'],
		];

		for (const config of [undefined, testConfig, configMatrix[3]]) {
			let current: any = undefined;

			for (const [section, what, value] of steps) {
				const { form, calls, mode } = legacyForm(current, config, skills5);
				if (section === '' && what === 'mode') {
					mode({ target: { value } });
				} else {
					form.props.onChange(section, what)({ target: { value } });
				}

				const c = Network.initConfig(clone(config));
				const next = Network.changeSettings(Network.initSettings(clone(current), c), c, section, what, value);
				expect(next).toEqual(calls.change);

				current = next;
			}

			expect(current.rtsp).toEqual({ udp: false, stimeout: '1000000' });
			expect(current.push).toEqual({ type: 'rtmp', name: Network.initConfig(config).channelid });
		}
	});

	test('probe (legacy handleProbe)', () => {
		let probed = 0;

		for (const settings of [undefined, ...networkSettingsMatrix().filter((_, i) => i % 7 === 0)]) {
			for (const skills of [undefined, skills4, skills6]) {
				const { form, calls } = legacyForm(settings, testConfig, skills);
				const b = outcome(() => form.props.onProbe());

				const config = Network.initConfig(clone(testConfig));
				const s = Network.initSettings(clone(settings), config);
				const a = outcome(() => [s, Network.createInputs(s, config, Network.initSkills(clone(skills)))]);

				expect(a.throws).toBe(b.throws);
				if (a.throws === undefined) {
					expect(a.value).toEqual(calls.probe);
					probed++;
				}
			}
		}

		expect(probed).toBeGreaterThan(60);
	});

	test('what the form shows (legacy AdvancedSettings)', () => {
		const s = (settings: any) => Network.initSettings(settings, Network.initConfig());

		expect(Network.getAdvancedProtocolClass(s({ address: 'rtsp://a/b' }))).toBe('rtsp');
		expect(Network.getAdvancedProtocolClass(s({ address: 'https://a/b' }))).toBe('http');
		expect(Network.getAdvancedProtocolClass(s({ mode: 'push', address: 'rtsp://a/b' }))).toBe('rtmp');
		expect(Network.getAdvancedProtocolClass(s({ mode: 'push', address: 'rtsp://a/b', push: { type: 'srt' } }))).toBe('srt');
		expect(Network.getAdvancedProtocolClass(s({ mode: 'push', address: 'rtsp://a/b', push: { type: 'hls' } }))).toBe('rtsp');

		expect(Network.getAnalyzedurationKey(s({ address: 'rtsp://a/b' }))).toBe('analyzeduration');
		expect(Network.getAnalyzedurationKey(s({ address: 'http://a/b' }))).toBe('analyzeduration_http');
		expect(Network.getAnalyzedurationKey(s({ address: 'rtmps://a/b' }))).toBe('analyzeduration_rtmp');
		expect(Network.getAnalyzedurationKey(s({ mode: 'push', address: 'http://a/b' }))).toBe('analyzeduration_rtmp');
		expect(Network.getAnalyzedurationKey(s({ mode: 'push', push: { type: 'srt' } }))).toBe('analyzeduration');
		expect(Network.getAnalyzedurationKey(s({ mode: 'push', push: { type: 'hls' } }))).toBe('analyzeduration_http');
	});
});

// The cases of legacy/src/views/Edit/Sources/Network.test.js, at the level of the data the form works with.
describe('network source (legacy/src/views/Edit/Sources/Network.test.js)', () => {
	const general = ['-fflags', '+genpts', '-thread_queue_size', 512, '-probesize', 5000000];
	const http = ['-analyzeduration', 20000000, '-re', '-r', 25, '-user_agent', 'foobaz/1', '-referer', 'http://example.com'];

	const pullSettings = {
		mode: 'pull',
		address: '',
		username: 'admin',
		password: 'foobar',
		rtsp: { udp: false, stimeout: 5000000 },
		http: { readNative: true, forceFramerate: true, framerate: 25, userAgent: 'foobaz/1', referer: 'http://example.com', http_proxy: '' },
		general: {
			analyzeduration: 5000000,
			analyzeduration_rtmp: 3000000,
			analyzeduration_http: 20000000,
			probesize: 5000000,
			max_probe_packets: 2500,
			fflags: ['genpts'],
			thread_queue_size: 512,
			copyts: false,
			start_at_zero: false,
			use_wallclock_as_timestamps: false,
			avoid_negative_ts: 'auto',
		},
	};

	const rtsp = { name: 'RTSP', from: 'rtsp://127.0.0.1/live/stream', address: 'rtsp://admin:foobar@127.0.0.1/live/stream' };
	const rtmp = { name: 'RTMP', from: 'rtmp://127.0.0.1/live/stream', address: 'rtmp://admin:foobar@127.0.0.1/live/stream' };
	const hls = {
		name: 'HTTP',
		from: 'http://127.0.0.1/live/stream.m3u8',
		address: 'http://admin:foobar@127.0.0.1/live/stream.m3u8',
		options: [...general, ...http],
	};
	const srt = {
		name: 'SRT',
		from: 'srt://127.0.0.1?mode=caller&streamid=foobar',
		address: 'srt://127.0.0.1?mode=caller&streamid=foobar',
		options: [...general, '-analyzeduration', 5000000],
	};
	const enhanced = ['-rtmp_enhanced_codecs', 'hvc1,av01,vp09'];

	const pull = [
		{ ...rtsp, skills: skills4, options: [...general, '-analyzeduration', 5000000, '-stimeout', 5000000, '-rtsp_transport', 'tcp'] },
		{ ...rtmp, skills: skills4, options: [...general, '-analyzeduration', 3000000] },
		{ ...hls, skills: skills4 },
		{ ...srt, skills: skills4 },
		{ ...rtsp, skills: skills5, options: [...general, '-analyzeduration', 5000000, '-timeout', 5000000, '-rtsp_transport', 'tcp'] },
		{ ...rtmp, skills: skills5, options: [...general, '-analyzeduration', 3000000] },
		{ ...hls, skills: skills5 },
		{ ...srt, skills: skills5 },
		{ ...rtsp, skills: skills6, options: [...general, '-analyzeduration', 5000000, '-timeout', 5000000, '-rtsp_transport', 'tcp'] },
		{ ...rtmp, skills: skills6, options: [...general, '-analyzeduration', 3000000, ...enhanced] },
		{ ...hls, skills: skills6 },
		{ ...srt, skills: skills6 },
	];

	for (const data of pull) {
		test(`pull ${data.name} input with ffmpeg ${data.skills.ffmpeg.version}`, () => {
			const inputs = Network.createInputs({ ...clone(pullSettings), address: data.from }, undefined, clone(data.skills));

			expect(inputs.length).toBe(1);
			expect(inputs[0]).toStrictEqual({ address: data.address, options: data.options });
		});
	}

	const push = [
		{ name: 'RTMP', type: 'rtmp', skills: skills4, address: '{rtmp,name=external.stream}', options: [...general, '-analyzeduration', 3000000] },
		{ name: 'SRT', type: 'srt', skills: skills4, address: '{srt,name=external.stream,mode=request}', options: [...general, '-analyzeduration', 5000000] },
		{ name: 'RTMP', type: 'rtmp', skills: skills5, address: '{rtmp,name=external.stream}', options: [...general, '-analyzeduration', 3000000] },
		{ name: 'SRT', type: 'srt', skills: skills5, address: '{srt,name=external.stream,mode=request}', options: [...general, '-analyzeduration', 5000000] },
		{
			name: 'RTMP',
			type: 'rtmp',
			skills: skills6,
			address: '{rtmp,name=external.stream}',
			options: [...general, '-analyzeduration', 3000000, ...enhanced],
		},
		{ name: 'SRT', type: 'srt', skills: skills6, address: '{srt,name=external.stream,mode=request}', options: [...general, '-analyzeduration', 5000000] },
	];

	for (const data of push) {
		test(`push ${data.name} input with ffmpeg ${data.skills.ffmpeg.version}`, () => {
			// as in the legacy test, the stream name is left to the default (the channel id)
			const settings = { mode: 'push', push: { type: data.type } };
			const inputs = Network.createInputs(settings, clone(testConfig), clone(data.skills));

			expect(inputs.length).toBe(1);
			expect(inputs[0]).toStrictEqual({ address: data.address, options: data.options });
		});
	}

	test('pull: the protocol must be known to ffmpeg', () => {
		const supported = (skills: unknown) => Network.isSupportedProtocol('rtsp://127.0.0.1/live/stream', Network.initSkills(clone(skills)).protocols.input);

		expect(Network.isValidURL('')).toBe(false);
		expect(Network.isValidURL('rtsp://127.0.0.1/live/stream')).toBe(true);
		expect(supported(undefined)).toBe(false);
		// rtsp is a demuxer, not a protocol; initSkills adds it
		expect(supported(skills4)).toBe(true);
		expect(supported(skills5)).toBe(true);
		expect(supported(skills6)).toBe(true);
	});

	test('push: needs RTMP or SRT in ffmpeg and the server enabled in the core', () => {
		const any = (skills: unknown) => {
			const protocols = Network.initSkills(clone(skills)).protocols.input;
			return Network.isSupportedProtocol('rtmp://', protocols) || Network.isSupportedProtocol('srt://', protocols);
		};

		expect(any(undefined)).toBe(false);
		expect(any(skills4)).toBe(true);
		expect(any(skills5)).toBe(true);
		expect(any(skills6)).toBe(true);

		expect(Network.initConfig(undefined).rtmp.enabled).toBe(false);
		expect(Network.initConfig(undefined).srt.enabled).toBe(false);
		expect(Network.initConfig(testConfig).rtmp.enabled).toBe(true);
		expect(Network.initConfig(testConfig).srt.enabled).toBe(true);

		const settings = Network.initSettings({ mode: 'push', push: { type: 'srt', name: 'external' } }, Network.initConfig(testConfig));
		expect(settings.mode).toBe('push');
		expect(settings.push.type).toBe('srt');
	});
});

describe('source select (legacy/src/views/Edit/SourceSelect.js)', () => {
	const versions = ['0.0.0', '4.0.9', '4.1.0', '4.4.1', '5.0.0', '5.1.2', '6.0.0', '6.1.0', '6.1.1', '7.1.0'];
	const known = [
		{},
		{ network: [] },
		{ network: [], virtualaudio: [], virtualvideo: [], noaudio: [], videoaudio: [], videoloop: [], audioloop: [] },
		{
			alsa: [{ id: 'hw:1,0', name: 'USB', media: 'audio' }],
			video4linux2: [{ id: '/dev/video0', name: 'cam', media: 'video', extra: 'uvc' }],
			raspicam: [],
			fbdev: [],
		},
		Object.fromEntries(LegacySources.IDs().map((id: string) => [id, []])),
	];
	const stored = [
		{ type: 'network', settings: { address: 'rtsp://a/b' } },
		{ type: 'alsa', settings: { device: '0,0' } },
		{ type: 'video4linux2', settings: {} },
		{ type: 'unknown', settings: { x: 1 } },
		{},
	];
	const configs = [undefined, {}, { network: testConfig, alsa: { x: 1 } }];

	// The legacy component as a plain function: the ids of the offered sources and the props of the form of the selected source.
	function legacySelect(props: any) {
		const tree: any = withHooks(() => LegacySourceSelect({ ...props, onChange() {}, onSelect() {}, onProbe() {}, onRefresh() {}, onStore() {} }));
		const select = tree.props.children[0].props.children;
		const list = select.type(select.props);
		const items = list.props.children;

		return { ids: Array.isArray(items) ? items.map((item: any) => item.key) : [], form: tree.props.children[1].props.children };
	}

	test('offered sources and the props of the selected form', () => {
		let forms = 0;
		let offered = 0;

		for (const type of ['video', 'audio', '']) {
			for (const version of versions) {
				for (const sources of known) {
					for (const source of stored) {
						for (const config of configs) {
							const skills = { ffmpeg: { version }, sources };
							const legacy = legacySelect({ type, skills: clone(skills), source: clone(source), config: clone(config) });

							const available = Registry.availableSources(type, Object.keys(sources), version);
							expect(available.map((s) => s.id)).toEqual(legacy.ids);
							offered += available.length;

							// the form is shown if the selected source exists and works with the ffmpeg version, even if it is not offered
							const selected = Sources.Get(source.type as string);
							const shown = selected !== null && Registry.isSupported(selected, version);
							expect(shown).toBe(legacy.form !== null);

							if (legacy.form !== null) {
								const id = source.type as string;
								expect(Registry.initConfig(clone(config))[id]).toEqual(legacy.form.props.config);
								expect(Registry.initStore(clone(source))[id]).toEqual(legacy.form.props.settings);
								// The form of a source the core does not know gets the [] of its defaultProps. The virtual
								// sources declare no such default and never read the prop, hence the `?? []`.
								expect(Registry.knownDevices(clone(sources) as Record<string, any>, id)).toEqual(legacy.form.props.knownDevices ?? []);
								forms++;
							}
						}
					}
				}
			}
		}

		expect(offered).toBeGreaterThan(1000);
		// 3 stream types x 6 supported ffmpeg versions x 5 skill sets x 3 stored sources that exist x 3 configs
		expect(forms).toBe(810);
	});

	test('the settings store keeps one entry per source', () => {
		const store = Registry.initStore({ type: 'alsa', settings: { device: '0,0' } });
		expect(Object.keys(store)).toEqual(Sources.IDs());
		expect(store.alsa).toEqual({ device: '0,0' });
		expect(store.network).toEqual({});
	});

	test('no source works with ffmpeg 7 (the legacy version ranges end at 6)', () => {
		const all = Sources.IDs();
		expect(Registry.availableSources('video', all, '6.1.1').map((s) => s.id)).toEqual([
			'network',
			'avfoundation',
			'video4linux2',
			'raspicam',
			'virtualvideo',
			'videoloop',
			'playlist',
		]);
		expect(Registry.availableSources('audio', all, '6.1.1').map((s) => s.id)).toEqual([
			'network',
			'alsa',
			'avfoundation',
			'virtualaudio',
			'noaudio',
			'videoaudio',
			'audioloop',
		]);
		expect(Registry.availableSources('video', all, '7.1.0')).toEqual([]);
		expect(Registry.availableSources('video', all, '6.0.0')).toEqual([]);
	});
});

describe('wizard sources', () => {
	const rtmpDevices = [
		{ id: 'abc.stream', name: 'abc.stream', media: 'rtmp' },
		{ id: 'srt-1', name: 'srt-1', media: 'srt' },
	];
	const avDevices = [
		{ id: '0', name: 'FaceTime HD Camera', media: 'video' },
		{ id: '1', name: 'Capture screen 0', media: 'video' },
		{ id: '0', name: 'MacBook Pro Microphone', media: 'audio' },
	];
	const v4lDevices = [
		{ id: '/dev/video0', name: 'mmal service 16.1', media: 'video', extra: 'bcm2835-v4l2' },
		{ id: '/dev/video1', name: 'USB cam', media: 'video', extra: 'uvcvideo' },
		{ id: '/dev/video2', name: 'pi cam 2', media: 'video', extra: 'platform:bcm2835_v4l2-0' },
		{ id: 'hw:1,0', name: 'USB audio', media: 'audio' },
	];

	const networkProps = (settings: any[], devices: any[][], skills: any[] = [undefined, skills4, skills5, skills6, ff(6, 1)]) =>
		settings.flatMap((s) =>
			configMatrix.flatMap((config) => skills.flatMap((sk) => devices.map((knownDevices) => ({ settings: s, config, skills: sk, knownDevices })))),
		);
	const deviceProps = (settings: any[], devices: any[][]) => settings.flatMap((s) => devices.map((knownDevices) => ({ settings: s, knownDevices })));

	// per wizard source: the props matrix and the changes to apply, by the label of the legacy form element
	const cases: Record<string, { props: any[]; updates: Record<string, [string, unknown?][]> }> = {
		network: {
			props: networkProps(
				[
					undefined,
					{},
					{ address: 'rtsp://cam.local/stream', username: 'admin', password: 'foobar' },
					{ address: 'http://127.0.0.1/live/stream.m3u8' },
					{ address: 'srt://127.0.0.1?mode=caller&streamid=foobar', username: 'ignored' },
					{ mode: 'push', address: 'rtmp://127.0.0.1/live/stream', push: { type: 'srt', name: 'none' } },
					{ address: 'nonsense', rtsp: { udp: true } },
				],
				[[]],
			),
			updates: {
				Address: [
					['address', 'rtmp://example.com/live/new'],
					['address', ''],
					['address', 'rtsp://cam/x'],
				],
				Username: [['username', 'bob']],
				Password: [['password', 's3cr3t']],
				'UDP transport': [['rtsp.udp'], ['rtsp.udp', 'ignored']],
			},
		},
		rtmp: {
			props: networkProps(
				[undefined, {}, { push: { name: 'none' } }, { push: { name: 'abc.stream', type: 'srt' } }, { mode: 'pull', address: 'rtsp://a/b' }],
				[[], rtmpDevices],
			),
			updates: {
				'Input stream': [
					['name', 'abc.stream'],
					['name', 'none'],
					['name', 'external'],
				],
			},
		},
		srt: {
			props: networkProps(
				[undefined, {}, { push: { name: 'none' } }, { push: { name: 'srt-1', type: 'rtmp' } }, { mode: 'pull', address: 'rtsp://a/b' }],
				[[], rtmpDevices],
			),
			updates: {
				'Input stream': [
					['name', 'srt-1'],
					['name', 'none'],
					['name', 'abc'],
				],
			},
		},
		avfoundation: {
			props: deviceProps(
				[
					undefined,
					{},
					{ vindex: '1', aindex: 'none', format: 'yuv420p', framerate: '30', size: '1280x720', cursor: true },
					{ vindex: '7', aindex: '3' },
				],
				[[], avDevices, avDevices.slice(2)],
			),
			updates: {
				'Video device': [
					['vindex', '1'],
					['vindex', 'default'],
				],
				'Audio Device': [
					['aindex', 'none'],
					['aindex', '0'],
				],
			},
		},
		raspicam: {
			props: deviceProps(
				[
					undefined,
					{},
					{ device: '/dev/video2' },
					{ device: '/dev/video1', format: 'h264', framerate: '30', size: '1280x720' },
					{ device: '/dev/video9' },
					{ device: '' },
				],
				[[], v4lDevices, v4lDevices.slice(1, 2), [{ id: '/dev/video5', name: 'no extra', media: 'video' }]],
			),
			updates: {
				'Video device': [
					['device', '/dev/video2'],
					['device', '/dev/video0'],
				],
			},
		},
		video4linux2: {
			props: deviceProps(
				[
					undefined,
					{},
					{ device: '/dev/video1' },
					{ device: '/dev/video0', format: 'mjpeg', framerate: '30', size: '640x360' },
					{ device: '/dev/video9' },
					{ device: '' },
				],
				[[], v4lDevices, v4lDevices.slice(0, 1), [{ id: '/dev/video5', name: 'no extra', media: 'video' }]],
			),
			updates: {
				'Video device': [
					['device', '/dev/video1'],
					['device', '/dev/video7'],
				],
			},
		},
	};

	// The legacy component as a plain function: what it reports on mount and the change handlers of its form elements.
	function legacyForm(legacy: any, props: any) {
		const calls: any[][] = [];
		const result = outcome(() =>
			withHooks(() => legacy.component({ ...clone(props), onChange: (...args: any[]) => calls.push(args), onRefresh: () => {} })),
		);

		return { mount: result.throws !== undefined ? { throws: result.throws } : { value: calls[0] }, calls, handlers: handlers(result.value) };
	}

	const reported = (change: Wizard.WizardChange) => [change.type, change.settings, change.inputs, change.ready];

	function compareWizard(ported: WizardSource, legacy: any, c: { props: any[]; updates: Record<string, [string, unknown?][]> }) {
		let mounted = 0;
		let updated = 0;

		for (const props of c.props) {
			const b = legacyForm(legacy, props);
			const a = outcome(() => reported(ported.change(clone(props))));
			expect(a).toEqual(b.mount);
			if (b.mount.value !== undefined) mounted++;

			for (const [label, updates] of Object.entries(c.updates)) {
				for (const [what, value] of updates) {
					// a fresh form per change; an element that is not shown (e.g. "UDP transport" unless RTSP) cannot change
					const form = legacyForm(legacy, props);
					const handler = form.handlers[label];
					if (handler === undefined) continue;

					const ub = outcome(() => {
						handler({ target: { value } });
						return form.calls[form.calls.length - 1];
					});
					const ua = outcome(() => reported(ported.update(clone(props), what, value)));
					expect(ua).toEqual(ub);
					if (ub.value !== undefined) {
						expect(form.calls.length).toBe(2);
						updated++;
					}
				}
			}
		}

		return { mounted, updated };
	}

	test('registers the legacy sources in the same order', () => {
		expect(LegacyWizardSources.IDs()).toEqual(['network', 'rtmp', 'srt', 'avfoundation', 'raspicam', 'video4linux2']);
		expect(WizardSources.IDs()).toEqual(LegacyWizardSources.IDs());
		expect(WizardSources.List().map((s) => s.id)).toEqual(LegacyWizardSources.List().map((s: any) => s.id));
		expect(WizardSources.Get('hls')).toBe(LegacyWizardSources.Get('hls'));
	});

	for (const id of LegacyWizardSources.IDs()) {
		test(id, () => {
			const ported = WizardSources.Get(id)!;
			const legacy = LegacyWizardSources.Get(id);
			expect(ported).not.toBeNull();
			compareMeta(ported, legacy);
			// the editor source the settings and inputs belong to
			expect(Sources.Get(ported.type)).not.toBeNull();

			const { mounted, updated } = compareWizard(ported, legacy, cases[id]!);
			expect(mounted).toBeGreaterThan(cases[id]!.props.length / 2);
			expect(updated).toBeGreaterThan(mounted);
		});
	}

	test('hls (not registered, as in legacy): the form throws when it creates its input', () => {
		compareMeta(InternalHLS, LegacyInternalHLS);

		const props = networkProps([undefined, {}, { push: { name: 'none' } }], [[]]);
		const { mounted } = compareWizard(InternalHLS, LegacyInternalHLS, { props, updates: {} });
		expect(mounted).toBe(0);
		expect(outcome(() => InternalHLS.change({})).throws).toBe('TypeError');
	});

	// Hand-derived: the list is built inline in the legacy wizard page (legacy/src/views/Edit/Wizard/index.js:239-259),
	// which cannot be run here.
	test('sources offered for a core', () => {
		const skills = (sources: string[], input: string[]) => ({ sources: Object.fromEntries(sources.map((s) => [s, []])), protocols: { input } });
		const ids = (s: ReturnType<typeof skills>) => Wizard.availableSources(s).map((source) => source.id);

		expect(Wizard.knownSources(skills([], ['rtmp', 'http', 'srt']))).toEqual([]);
		expect(Wizard.knownSources(skills(['network'], []))).toEqual(['network']);
		expect(Wizard.knownSources(skills(['network'], ['srt', 'http', 'rtmp']))).toEqual(['network', 'rtmp', 'hls', 'srt']);
		expect(Wizard.knownSources(skills(['alsa', 'raspicam', 'video4linux2', 'avfoundation', 'fbdev', 'virtualvideo'], ['rtmp']))).toEqual([
			'raspicam',
			'video4linux2',
			'avfoundation',
		]);

		expect(ids(skills(['network'], ['rtmp', 'http', 'srt']))).toEqual(['network', 'rtmp', 'srt']);
		expect(ids(skills(['network'], ['http', 'https']))).toEqual(['network']);
		expect(ids(skills(['network'], ['rtmps', 'srt']))).toEqual(['network', 'srt']);
		expect(ids(skills(['video4linux2', 'raspicam', 'network', 'avfoundation'], ['rtmp']))).toEqual([
			'network',
			'rtmp',
			'avfoundation',
			'raspicam',
			'video4linux2',
		]);
		expect(ids(skills(['alsa', 'virtualaudio'], ['rtmp', 'srt']))).toEqual([]);
	});
});

// Hand-derived from the checks in legacy/src/misc/UploadButton.js, which run inside a file input handler.
describe('upload checks of the loop sources', () => {
	const video = Sources.Get('videoloop') as unknown as typeof import('./videoloop');
	const audio = Sources.Get('audioloop') as unknown as typeof import('./audioloop');

	test('accepted types', () => {
		expect(video.storeName).toBe('videoloop.source');
		expect(audio.storeName).toBe('audioloop.source');
		expect(checkUpload({ type: 'image/png', size: 1024 }, video.acceptTypes)).toEqual({ type: video.acceptTypes[0]! });
		expect(checkUpload({ type: 'video/mp4', size: 25 * 1024 * 1024 }, video.acceptTypes)).toEqual({ type: video.acceptTypes[1]! });
		expect(checkUpload({ type: 'audio/mpeg', size: 1 }, audio.acceptTypes)).toEqual({ type: audio.acceptTypes[0]! });
	});

	test('rejections', () => {
		expect(checkUpload(undefined, video.acceptTypes)).toEqual({ error: { type: 'nofiles' } });
		expect(checkUpload({ type: 'audio/mpeg', size: 1 }, video.acceptTypes)).toEqual({
			error: { type: 'mimetype', actual: 'audio/mpeg', allowed: ['image/*', 'video/*'] },
		});
		expect(checkUpload({ type: 'image/png', size: 2 * 1024 * 1024 + 1 }, video.acceptTypes)).toEqual({
			error: { type: 'size', actual: 2 * 1024 * 1024 + 1, allowed: 2 * 1024 * 1024 },
		});
		expect(checkUpload({ type: '', size: 1 }, audio.acceptTypes)).toEqual({ error: { type: 'mimetype', actual: '', allowed: ['audio/*'] } });
	});
});
