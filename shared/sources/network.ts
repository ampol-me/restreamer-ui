// Ported from legacy/src/views/Edit/Sources/Network.js
import urlparser from 'url-parse';

import type { SourceCapability, SourceInput } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface Settings {
	mode: string;
	address: string;
	username: string;
	password: string;
	push: {
		type: string;
		name: string;
	} & Record<string, any>;
	rtsp: {
		udp: boolean;
		stimeout: number | string;
	} & Record<string, any>;
	http: {
		readNative: boolean;
		forceFramerate: boolean;
		framerate: number | string;
		userAgent: string;
		referer: string;
		http_proxy: string;
	} & Record<string, any>;
	general: {
		analyzeduration: number | string;
		analyzeduration_rtmp: number | string;
		analyzeduration_http: number | string;
		probesize: number | string;
		max_probe_packets: number | string;
		fflags: string[];
		thread_queue_size: number | string;
		copyts: boolean;
		start_at_zero: boolean;
		use_wallclock_as_timestamps: boolean;
		avoid_negative_ts: string;
	} & Record<string, any>;
	[key: string]: any;
}

export interface Config {
	rtmp: {
		enabled: boolean;
		secure: boolean;
		host: string;
		local: string;
		app: string;
		token: string;
	} & Record<string, any>;
	srt: {
		enabled: boolean;
		host: string;
		local: string;
		token: string;
		passphrase: string;
	} & Record<string, any>;
	hls: {
		secure: boolean;
		host: string;
		local: string;
		credentials: string;
	} & Record<string, any>;
	channelid: string;
	[key: string]: any;
}

export interface Skills {
	ffmpeg: {
		version: string;
		version_major: number;
		version_minor: number;
	} & Record<string, any>;
	formats: {
		demuxers: string[];
	} & Record<string, any>;
	protocols: {
		input: string[];
	} & Record<string, any>;
	[key: string]: any;
}

const initSettings = (initialSettings: any, config: any): Settings => {
	if (!initialSettings) {
		initialSettings = {};
	}

	const settings = {
		mode: 'pull',
		address: '',
		username: '',
		password: '',
		push: {},
		rtsp: {},
		http: {},
		general: {},
		...initialSettings,
	};

	settings.push = {
		type: 'rtmp',
		name: config.channelid,
		...settings.push,
	};

	settings.rtsp = {
		udp: false,
		stimeout: 5000000,
		...settings.rtsp,
	};

	settings.http = {
		readNative: true,
		forceFramerate: false,
		framerate: 25,
		userAgent: '',
		referer: '',
		http_proxy: '',
		...settings.http,
	};

	settings.general = {
		analyzeduration: 5_000_000, // microseconds, 5s
		analyzeduration_rtmp: 3_000_000, // 3s
		analyzeduration_http: 20_000_000, // 20s
		probesize: 5_000_000, // bytes
		max_probe_packets: 2500,
		fflags: ['genpts'],
		thread_queue_size: 512,
		copyts: false,
		start_at_zero: false,
		use_wallclock_as_timestamps: false,
		avoid_negative_ts: 'auto',
		...settings.general,
	};

	return settings;
};

const initConfig = (initialConfig?: any): Config => {
	if (!initialConfig) {
		initialConfig = {};
	}

	const config = {
		rtmp: {},
		srt: {},
		hls: {},
		channelid: 'external',
		...initialConfig,
	};

	config.rtmp = {
		enabled: false,
		secure: false,
		host: 'localhost',
		local: 'localhost',
		app: '',
		token: '',
		...config.rtmp,
	};

	config.srt = {
		enabled: false,
		host: 'localhost',
		local: 'localhost',
		token: '',
		passphrase: '',
		...config.srt,
	};

	config.hls = {
		secure: false,
		host: 'localhost',
		local: 'localhost',
		credentials: '',
		...config.hls,
	};

	return config;
};

// As in legacy, the `protocols.input` array of the given skills is extended in place.
const initSkills = (initialSkills?: any): Skills => {
	if (!initialSkills) {
		initialSkills = {};
	}

	const skills = {
		ffmpeg: {},
		formats: {},
		protocols: {},
		...initialSkills,
	};

	skills.ffmpeg = {
		version: '0.0.0',
		version_major: 0,
		version_minor: 0,
		...skills.ffmpeg,
	};

	skills.formats = {
		demuxers: [],
		...skills.formats,
	};

	skills.protocols = {
		input: [],
		...skills.protocols,
	};

	if (skills.formats.demuxers.includes('rtsp')) {
		if (!skills.protocols.input.includes('rtsp')) {
			skills.protocols.input.push('rtsp');
		}

		if (skills.protocols.input.includes('tls')) {
			if (!skills.protocols.input.includes('rtsps')) {
				skills.protocols.input.push('rtsps');
			}
		}
	}

	return skills;
};

// Legacy reads skills.codecs.video without a default: an RTMP input with ffmpeg >= 6 throws if the skills have no codecs.
const enhancedRTMPCodecs = (skills: Skills): string[] => {
	const codecs = [];
	if (skills.codecs.video.hevc?.length > 0) {
		codecs.push('hvc1');
	}
	if (skills.codecs.video.av1?.length > 0) {
		codecs.push('av01');
	}
	if (skills.codecs.video.vp9?.length > 0) {
		codecs.push('vp09');
	}

	return codecs;
};

const createInputs = (settings: any, config?: any, skills?: any): SourceInput[] => {
	config = initConfig(config);
	settings = initSettings(settings, config);
	skills = initSkills(skills);

	const input: SourceInput = {
		address: '',
		options: [],
	};

	if (settings.mode === 'push') {
		let name = settings.push.name;
		if (settings.push.type === 'hls') {
			if (name === 'none') {
				name = config.channelid;
			}
			// Legacy passes the name where getLocalHLS expects the config, which throws on `config.hls.local`.
			// HLS push is not offered by any form (legacy/src/views/Edit/Sources/Network.js:197).
			input.address = getLocalHLS(name);
		} else if (settings.push.type === 'rtmp') {
			if (name === config.channelid) {
				name += '.stream';
			}
			input.address = getLocalRTMP(name);
		} else if (settings.push.type === 'srt') {
			if (name === config.channelid) {
				name += '.stream';
			}
			input.address = getLocalSRT(name);
		} else {
			input.address = '';
		}
	} else {
		input.address = settings.address;
	}

	// registrate protocol by address
	const protocol = getProtocolClass(input.address);

	// general settings (pull/push)
	if (settings.general.fflags.length !== 0) {
		input.options.push('-fflags', '+' + settings.general.fflags.join('+'));
	}
	input.options.push('-thread_queue_size', settings.general.thread_queue_size);
	input.options.push('-probesize', settings.general.probesize);

	if (settings.general.max_probe_packets !== 2500) {
		input.options.push('-max_probe_packets', settings.general.max_probe_packets);
	}
	if (settings.general.copyts) {
		input.options.push('-copyts');
	}
	if (settings.general.start_at_zero) {
		input.options.push('-start_at_zero');
	}
	if (settings.general.use_wallclock_as_timestamps) {
		input.options.push('-use_wallclock_as_timestamps', '1');
	}
	if (skills.ffmpeg.version_major >= 5 && settings.general.avoid_negative_ts !== 'auto') {
		input.options.push('-avoid_negative_ts', settings.general.avoid_negative_ts);
	}

	// general settings > analyzeduration by protocol
	//
	// old settings:
	// analyzeduration: 20s for http and 3s for rtmp streams
	if (settings.mode === 'push') {
		if (settings.push.type === 'hls') {
			input.options.push('-analyzeduration', settings.general.analyzeduration_http);
		} else if (settings.push.type === 'rtmp') {
			input.options.push('-analyzeduration', settings.general.analyzeduration_rtmp);

			if (skills.ffmpeg.version_major >= 6) {
				const codecs = enhancedRTMPCodecs(skills);

				if (codecs.length !== 0) {
					input.options.push('-rtmp_enhanced_codecs', codecs.join(','));
				}
			}
		} else if (settings.push.type === 'srt') {
			input.options.push('-analyzeduration', settings.general.analyzeduration);
		}
	} else {
		input.address = addUsernamePassword(input.address, settings.username, settings.password);

		if (protocol === 'http') {
			input.options.push('-analyzeduration', settings.general.analyzeduration_http);

			if (settings.http.readNative === true) {
				input.options.push('-re');
			}

			if (settings.http.forceFramerate === true) {
				input.options.push('-r', settings.http.framerate);
			}

			if (settings.http.userAgent.length !== 0) {
				input.options.push('-user_agent', settings.http.userAgent);
			}

			if (settings.http.referer.length !== 0) {
				input.options.push('-referer', settings.http.referer);
			}

			if (settings.http.http_proxy.length !== 0) {
				input.options.push('-http_proxy', settings.http.http_proxy);
			}
		} else if (protocol === 'rtmp') {
			input.options.push('-analyzeduration', settings.general.analyzeduration_rtmp);

			if (skills.ffmpeg.version_major >= 6) {
				const codecs = enhancedRTMPCodecs(skills);

				if (codecs.length !== 0) {
					input.options.push('-rtmp_enhanced_codecs', codecs.join(','));
				}
			}
		} else {
			input.options.push('-analyzeduration', settings.general.analyzeduration);

			if (protocol === 'rtsp') {
				if (skills.ffmpeg.version_major === 4) {
					input.options.push('-stimeout', settings.rtsp.stimeout);
				} else {
					input.options.push('-timeout', settings.rtsp.stimeout);
				}

				if (settings.rtsp.udp === true) {
					input.options.push('-rtsp_transport', 'udp');
				} else {
					input.options.push('-rtsp_transport', 'tcp');
				}
			}
		}
	}

	return [input];
};

const addUsernamePassword = (address: string, username: string, password: string): string => {
	if (username.length === 0 && password.length === 0) {
		return address;
	}

	if (isAuthProtocol(address) === false) {
		return address;
	}

	const url = urlparser(address, {});
	if (username.length !== 0) {
		url.set('username', username);
	}
	if (password.length !== 0) {
		url.set('password', password);
	}

	return url.toString();
};

const getProtocol = (url: string): string => {
	const re = new RegExp('^([a-z][a-z0-9.+-:]*)://', 'i');
	const matches = url.match(re);

	if (matches === null || matches.length === 0) {
		return '';
	}

	return matches[1]!;
};

// The class tests are unanchored as in legacy: any protocol that merely contains "rtmp", "http", … falls into that class.
const getProtocolClass = (url: unknown): string => {
	if (typeof url !== 'string') {
		url = '';
	}

	const protocol = getProtocol(url as string);
	if (protocol.length === 0) {
		return '';
	}

	if (/rtmp(e|s|t)?/.test(protocol) === true) {
		return 'rtmp';
	} else if (/https?/.test(protocol) === true) {
		return 'http';
	} else if (/mms(t|h)/.test(protocol) === true) {
		return 'mms';
	} else if (/rtsps?/.test(protocol) === true) {
		return 'rtsp';
	}

	return protocol;
};

const isAuthProtocol = (url: unknown): boolean => {
	const protocolClass = getProtocolClass(url);

	switch (protocolClass) {
		case 'amqp':
		case 'ftp':
		case 'http':
		case 'icecast':
		case 'mms':
		case 'rtmp':
		case 'sftp':
		case 'rtsp':
			return true;
	}

	return false;
};

const isSupportedProtocol = (url: string, supportedProtocols: string[]): boolean => {
	const protocol = getProtocol(url);
	if (protocol.length === 0) {
		return false;
	}

	if (!supportedProtocols.includes(protocol)) {
		return false;
	}

	return true;
};

const getHLSAddress = (host: string, credentials: string, name: string, secure: boolean): string => {
	const url = 'http' + (secure ? 's' : '') + '://' + (credentials.length !== 0 ? credentials + '@' : '') + host + '/memfs/' + name + '.m3u8';

	return url;
};

const getRTMPAddress = (host: string, app: string, name: string, token: string, secure: boolean): string => {
	let url = 'rtmp' + (secure ? 's' : '') + '://' + host + app + '/' + name + '.stream';

	if (token.length !== 0) {
		url += '/' + encodeURIComponent(token);
	}

	return url;
};

const getSRTAddress = (host: string, name: string, token: string, passphrase: string, publish: boolean): string => {
	let url =
		'srt' +
		'://' +
		host +
		'?mode=caller&transtype=live&streamid=' +
		name +
		'.stream,mode:' +
		(publish ? 'publish' : 'request') +
		(token.length !== 0 ? ',token:' + encodeURIComponent(token) : '');

	if (passphrase.length !== 0) {
		url += '&passphrase=' + encodeURIComponent(passphrase);
	}

	return url;
};

// The addresses to send a stream to always carry the channel id; the `name` some legacy callers pass is ignored.
const getHLS = (config: Config, _name?: string): string => {
	const url = getHLSAddress(config.hls.host, config.hls.credentials, config.channelid, config.hls.secure);

	return url;
};

const getRTMP = (config: Config, _name?: string): string => {
	const url = getRTMPAddress(config.rtmp.host, config.rtmp.app, config.channelid, config.rtmp.token, config.rtmp.secure);

	return url;
};

const getSRT = (config: Config, _name?: string): string => {
	const url = getSRTAddress(config.srt.host, config.channelid, config.srt.token, config.srt.passphrase, true);

	return url;
};

const getLocalHLS = (config: any, _name?: string): string => {
	const url = getHLSAddress(config.hls.local, '', config.channelid, false);

	return url;
};

const getLocalRTMP = (name: string): string => {
	return '{rtmp,name=' + name + '}';
};

const getLocalSRT = (name: string): string => {
	return '{srt,name=' + name + ',mode=request}';
};

const isValidURL = (address: unknown): boolean => {
	const protocol = getProtocolClass(address);
	if (protocol.length === 0) {
		return false;
	}

	return true;
};

/** The protocol class the advanced settings are shown for (legacy AdvancedSettings). */
const getAdvancedProtocolClass = (settings: Settings): string => {
	let protocolClass = getProtocolClass(settings.address);
	if (settings.mode === 'push') {
		switch (settings.push.type) {
			case 'rtmp':
				protocolClass = 'rtmp';
				break;
			case 'srt':
				protocolClass = 'srt';
				break;
			default:
		}
	}

	return protocolClass;
};

/** Which of the three analyzeduration settings applies to the current mode and protocol (legacy AdvancedSettings). */
const getAnalyzedurationKey = (settings: Settings): 'analyzeduration' | 'analyzeduration_http' | 'analyzeduration_rtmp' => {
	const protocolClass = getAdvancedProtocolClass(settings);

	return settings.mode === 'push'
		? settings.push.type === 'hls'
			? 'analyzeduration_http'
			: settings.push.type === 'rtmp'
				? 'analyzeduration_rtmp'
				: 'analyzeduration'
		: protocolClass === 'http'
			? 'analyzeduration_http'
			: protocolClass === 'rtmp'
				? 'analyzeduration_rtmp'
				: 'analyzeduration';
};

/**
 * Legacy Source.handleChange: the settings after the form field `what` of `section` ('' for the top level) changed.
 * Checkbox fields toggle and ignore the value; changing the push protocol resets the stream name to the channel id.
 */
const changeSettings = (settings: Settings, config: Config, section: string, what: string, value?: unknown): Settings => {
	if (section === 'http') {
		if (['readNative', 'forceFramerate'].includes(what)) {
			settings.http[what] = !settings.http[what];
		} else {
			settings.http[what] = value;
		}
	} else if (section === 'rtsp') {
		if (['udp'].includes(what)) {
			settings.rtsp[what] = !settings.rtsp[what];
		} else {
			settings.rtsp[what] = value;
		}
	} else if (section === 'general') {
		if (['copyts', 'start_at_zero', 'use_wallclock_as_timestamps'].includes(what)) {
			settings.general[what] = !settings.general[what];
		} else {
			settings.general[what] = value;
		}
	} else if (section === 'push') {
		settings.push[what] = value;
		if (what === 'type') {
			settings.push.name = config.channelid;
		}
	} else {
		settings[what] = value;
	}

	return {
		...settings,
	};
};

const id = 'network';
const name = 'Network source';
const capabilities: SourceCapability[] = ['audio', 'video'];
const ffversion = '^4.1.0 || ^5.0.0 || ^6.1.0';
const icon = 'i-lucide-network';

const func = {
	initSettings,
	initConfig,
	initSkills,
	createInputs,
	getProtocolClass,
	getHLS,
	getRTMP,
	getSRT,
	isValidURL,
	isAuthProtocol,
	isSupportedProtocol,
};

export {
	id,
	name,
	capabilities,
	ffversion,
	icon,
	func,
	initSettings,
	initConfig,
	initSkills,
	createInputs,
	changeSettings,
	getProtocol,
	getProtocolClass,
	getAdvancedProtocolClass,
	getAnalyzedurationKey,
	getHLS,
	getRTMP,
	getSRT,
	isValidURL,
	isAuthProtocol,
	isSupportedProtocol,
};
