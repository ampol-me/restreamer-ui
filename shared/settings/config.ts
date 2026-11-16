// The logic of the system settings, taken out of legacy/src/views/Settings.js: the core config
// (GET /v3/config) becomes the form model, the form model becomes the PUT /v3/config payload,
// plus the validation rules, the tab a config value belongs to and the wait for a core restart.

/** The core config as the API returns it. Only the fields of the form are known; the rest passes through. */
export type CoreConfig = Record<string, unknown>;

/** What `restreamer.Config()` resolves to. */
export interface CoreConfigResponse {
	config: CoreConfig;
	overrides?: string[];
	created_at: Date | null;
	loaded_at: Date | null;
	updated_at: Date | null;
}

/** A number input holds a number, or a string while it is being edited (empty = 0, see toInt). */
export type FormNumber = number | string;

export interface SettingsForm {
	update_check: boolean;
	id: string;
	name: string;
	// The listen addresses are edited as their port only.
	address: FormNumber;
	host: { name: string };
	log: { level: string; max_lines: FormNumber };
	tls: { address: FormNumber; auto: boolean; email: string };
	api: { auth: { enable: boolean; username: string; password: string } };
	rtmp: { enable: boolean; enable_tls: boolean; address: FormNumber; address_tls: FormNumber; app: string; token: string };
	srt: { enable: boolean; address: FormNumber; passphrase: string; token: string };
	ffmpeg: { log: { max_lines: FormNumber; max_history: FormNumber } };
	storage: {
		// allow_all is not a core value: it stands for origins = ['*'].
		cors: { allow_all: boolean; origins: string };
		disk: {
			max_size_mbytes: FormNumber;
			cache: {
				enable: boolean;
				max_size_mbytes: FormNumber;
				ttl_seconds: FormNumber;
				max_file_size_mbytes: FormNumber;
				types: { allow: string; block: string };
			};
		};
		memory: { auth: { enable: boolean; username: string; password: string }; max_size_mbytes: FormNumber; purge: boolean };
	};
	sessions: {
		enable: boolean;
		ip_ignorelist: string;
		session_timeout_sec: FormNumber;
		persist: boolean;
		max_bitrate_mbit: FormNumber;
		max_sessions: FormNumber;
	};
	service: { enable: boolean; token: string };
}

export type SettingsTab = 'general' | 'service' | 'network' | 'auth' | 'playback' | 'storage' | 'rtmp' | 'srt' | 'logging';

/**
 * The config values the form edits and the tab each one is shown on (legacy `configValues`).
 * Legacy filed `storage.cors.origins` under "storage" although the field sits on the Playback
 * tab, so a core error for it flagged the wrong tab and was never displayed; it is "playback" here.
 */
export const CONFIG_VALUE_TABS = {
	update_check: 'general',
	id: 'service',
	name: 'service',
	'log.level': 'logging',
	'log.max_lines': 'logging',
	address: 'network',
	'host.name': 'network',
	'tls.address': 'network',
	'tls.auto': 'network',
	'tls.email': 'network',
	'api.auth.enable': 'auth',
	'api.auth.username': 'auth',
	'api.auth.password': 'auth',
	'rtmp.enable': 'rtmp',
	'rtmp.enable_tls': 'rtmp',
	'rtmp.address': 'rtmp',
	'rtmp.address_tls': 'rtmp',
	'rtmp.app': 'rtmp',
	'rtmp.token': 'rtmp',
	'ffmpeg.log.max_lines': 'logging',
	'ffmpeg.log.max_history': 'logging',
	'srt.enable': 'srt',
	'srt.address': 'srt',
	'srt.passphrase': 'srt',
	'srt.token': 'srt',
	'storage.cors.allow_all': 'playback',
	'storage.cors.origins': 'playback',
	'storage.disk.max_size_mbytes': 'storage',
	'storage.disk.cache.enable': 'storage',
	'storage.disk.cache.max_size_mbytes': 'storage',
	'storage.disk.cache.ttl_seconds': 'storage',
	'storage.disk.cache.max_file_size_mbytes': 'storage',
	'storage.disk.cache.types.allow': 'storage',
	'storage.disk.cache.types.block': 'storage',
	'storage.memory.auth.enable': 'storage',
	'storage.memory.auth.username': 'storage',
	'storage.memory.auth.password': 'storage',
	'storage.memory.max_size_mbytes': 'storage',
	'storage.memory.purge': 'storage',
	'sessions.enable': 'playback',
	'sessions.ip_ignorelist': 'playback',
	'sessions.session_timeout_sec': 'playback',
	'sessions.persist': 'playback',
	'sessions.max_bitrate_mbit': 'network',
	'sessions.max_sessions': 'network',
	'service.enable': 'service',
	'service.token': 'service',
} as const satisfies Record<string, SettingsTab>;

export type ConfigValue = keyof typeof CONFIG_VALUE_TABS;

/** The custom JSON config on the Service tab is not a config value, but it can carry errors. */
export const CORE_CONFIG_FIELD = 'coreconfig';

export interface SettingsMessage {
	configvalue: string;
	error: string;
	// A rule of this UI (English text, translatable) rather than a message of the core.
	translate?: boolean;
}

/** What the fields of the form get from the page (provide/inject under SETTINGS_CONTEXT). */
export interface SettingsContext {
	env(configvalue: string): boolean;
	errors(configvalue: string): SettingsMessage[];
}

export const SETTINGS_CONTEXT = 'settings';

export const isConfigValue = (name: string): name is ConfigValue => Object.hasOwn(CONFIG_VALUE_TABS, name);

export function tabOf(configvalue: string): SettingsTab | null {
	if (configvalue === CORE_CONFIG_FIELD) return 'service';
	return isConfigValue(configvalue) ? CONFIG_VALUE_TABS[configvalue] : null;
}

// Helpers

export const toArray = (val: string, separator: string): string[] =>
	val
		.split(separator)
		.map((l) => l.trim())
		.filter((l) => l.length !== 0);

export const toInt = (val: FormNumber): number => {
	if (typeof val === 'string') {
		return val.length === 0 ? 0 : parseInt(val);
	}

	return val;
};

/**
 * Splits a listen address ("host:port", ":port", "[::1]:port") at its last colon.
 * Legacy dropped every colon and showed the rest as the port, which turned "127.0.0.1:8080"
 * into port "127.0.0.18080" and saved ":127.0.0.18080"; the host is kept apart here instead.
 */
export function parseListenAddress(address: string): { host: string; port: string } {
	const colon = address.lastIndexOf(':');
	if (colon === -1) {
		return { host: '', port: address };
	}

	return { host: address.slice(0, colon), port: address.slice(colon + 1) };
}

export const formatListenAddress = (host: string, port: FormNumber): string => host + ':' + String(port);

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getPath(config: CoreConfig, path: string): unknown {
	let value: unknown = config;
	for (const key of path.split('.')) {
		if (!isObject(value) || !(key in value)) return undefined;
		value = value[key];
	}

	return value;
}

function setPath(config: CoreConfig, path: string, value: unknown): void {
	const keys = path.split('.');
	const last = keys.pop() as string;

	let target = config;
	for (const key of keys) {
		const next = target[key];
		if (isObject(next)) {
			target = next;
		} else {
			const created: Record<string, unknown> = {};
			target[key] = created;
			target = created;
		}
	}

	target[last] = value;
}

function deletePath(config: CoreConfig, path: string): void {
	const keys = path.split('.');
	const last = keys.pop() as string;

	let target: unknown = config;
	for (const key of keys) {
		if (!isObject(target)) return;
		target = target[key];
	}

	if (isObject(target)) {
		// eslint-disable-next-line @typescript-eslint/no-dynamic-delete
		delete target[last];
	}
}

// A core that does not know a value (older version) leaves it out; the form then starts empty.
const str = (config: CoreConfig, path: string): string => {
	const value = getPath(config, path);
	return typeof value === 'string' ? value : '';
};
const bool = (config: CoreConfig, path: string): boolean => getPath(config, path) === true;
const num = (config: CoreConfig, path: string): number => {
	const value = getPath(config, path);
	return typeof value === 'number' ? value : 0;
};
const list = (config: CoreConfig, path: string): string[] => {
	const value = getPath(config, path);
	return Array.isArray(value) ? value.map(String) : [];
};
const port = (config: CoreConfig, path: string): string => parseListenAddress(str(config, path)).port;

/** The listen addresses of the config; the form holds their port, the payload gets the host back. */
const LISTEN_ADDRESSES = ['address', 'tls.address', 'rtmp.address', 'rtmp.address_tls', 'srt.address'] as const;

// Core config -> form (legacy load())

export function toForm(config: CoreConfig): SettingsForm {
	const origins = list(config, 'storage.cors.origins');

	return {
		update_check: bool(config, 'update_check'),
		id: str(config, 'id'),
		name: str(config, 'name'),
		address: port(config, 'address'),
		host: { name: list(config, 'host.name').join(', ') },
		log: { level: str(config, 'log.level'), max_lines: num(config, 'log.max_lines') },
		tls: {
			address: port(config, 'tls.address'),
			// The form only knows Let's Encrypt: without TLS there is no auto TLS either.
			auto: bool(config, 'tls.enable') && bool(config, 'tls.auto'),
			email: str(config, 'tls.email'),
		},
		api: {
			auth: {
				enable: bool(config, 'api.auth.enable'),
				username: str(config, 'api.auth.username'),
				password: str(config, 'api.auth.password'),
			},
		},
		rtmp: {
			enable: bool(config, 'rtmp.enable'),
			enable_tls: bool(config, 'rtmp.enable_tls'),
			address: port(config, 'rtmp.address'),
			address_tls: port(config, 'rtmp.address_tls'),
			app: str(config, 'rtmp.app'),
			token: str(config, 'rtmp.token'),
		},
		srt: {
			enable: bool(config, 'srt.enable'),
			address: port(config, 'srt.address'),
			passphrase: str(config, 'srt.passphrase'),
			token: str(config, 'srt.token'),
		},
		ffmpeg: { log: { max_lines: num(config, 'ffmpeg.log.max_lines'), max_history: num(config, 'ffmpeg.log.max_history') } },
		storage: {
			cors: { allow_all: origins.length === 1 && origins[0] === '*', origins: origins.join('\n') },
			disk: {
				max_size_mbytes: num(config, 'storage.disk.max_size_mbytes'),
				cache: {
					enable: bool(config, 'storage.disk.cache.enable'),
					max_size_mbytes: num(config, 'storage.disk.cache.max_size_mbytes'),
					ttl_seconds: num(config, 'storage.disk.cache.ttl_seconds'),
					max_file_size_mbytes: num(config, 'storage.disk.cache.max_file_size_mbytes'),
					types: {
						allow: list(config, 'storage.disk.cache.types.allow').join('\n'),
						block: list(config, 'storage.disk.cache.types.block').join('\n'),
					},
				},
			},
			memory: {
				auth: {
					enable: bool(config, 'storage.memory.auth.enable'),
					username: str(config, 'storage.memory.auth.username'),
					password: str(config, 'storage.memory.auth.password'),
				},
				max_size_mbytes: num(config, 'storage.memory.max_size_mbytes'),
				purge: bool(config, 'storage.memory.purge'),
			},
		},
		sessions: {
			enable: bool(config, 'sessions.enable'),
			ip_ignorelist: list(config, 'sessions.ip_ignorelist').join('\n'),
			session_timeout_sec: num(config, 'sessions.session_timeout_sec'),
			persist: bool(config, 'sessions.persist'),
			max_bitrate_mbit: num(config, 'sessions.max_bitrate_mbit'),
			max_sessions: num(config, 'sessions.max_sessions'),
		},
		service: { enable: bool(config, 'service.enable'), token: str(config, 'service.token') },
	};
}

// Form -> PUT /v3/config payload (legacy handleSave())

/**
 * The loaded config with the form written over it. Values an environment variable sets are
 * left out, as the core rejects (or would persist) what it does not own.
 */
export function toPayload(config: CoreConfig, form: SettingsForm, overrides: string[] = []): CoreConfig {
	// Poor man's deep clone, but that's OK because we have only basic data types
	const payload = JSON.parse(JSON.stringify(config)) as CoreConfig;

	const set = (path: ConfigValue, value: unknown) => setPath(payload, path, value);

	set('update_check', form.update_check);
	set('id', form.id);
	set('name', form.name);

	set('log.level', form.log.level);
	set('log.max_lines', toInt(form.log.max_lines));

	set('host.name', toArray(form.host.name, ','));

	const listen: Record<(typeof LISTEN_ADDRESSES)[number], FormNumber> = {
		address: form.address,
		'tls.address': form.tls.address,
		'rtmp.address': form.rtmp.address,
		'rtmp.address_tls': form.rtmp.address_tls,
		'srt.address': form.srt.address,
	};
	for (const path of LISTEN_ADDRESSES) {
		set(path, formatListenAddress(parseListenAddress(str(config, path)).host, listen[path]));
	}

	set('tls.auto', form.tls.auto);
	set('tls.email', form.tls.email);
	// Legacy set tls.enable = tls.auto, which switched off a TLS setup with own certificates
	// (enable without auto) on every save. That setup, which the form cannot express, is kept.
	const ownCertificates = bool(config, 'tls.enable') && !bool(config, 'tls.auto');
	setPath(payload, 'tls.enable', form.tls.auto || ownCertificates);

	set('api.auth.enable', form.api.auth.enable);
	set('api.auth.username', form.api.auth.username);
	set('api.auth.password', form.api.auth.password);

	set('rtmp.enable', form.rtmp.enable);
	set('rtmp.enable_tls', form.rtmp.enable_tls);
	set('rtmp.app', !form.rtmp.app.startsWith('/') ? '/' + form.rtmp.app : form.rtmp.app);
	set('rtmp.token', form.rtmp.token);

	set('srt.enable', form.srt.enable);
	set('srt.passphrase', form.srt.passphrase);
	set('srt.token', form.srt.token);

	set('ffmpeg.log.max_lines', toInt(form.ffmpeg.log.max_lines));
	set('ffmpeg.log.max_history', toInt(form.ffmpeg.log.max_history));

	set('storage.cors.origins', form.storage.cors.allow_all ? ['*'] : toArray(form.storage.cors.origins, '\n'));
	set('storage.disk.max_size_mbytes', toInt(form.storage.disk.max_size_mbytes));
	set('storage.disk.cache.enable', form.storage.disk.cache.enable);
	set('storage.disk.cache.max_size_mbytes', toInt(form.storage.disk.cache.max_size_mbytes));
	set('storage.disk.cache.ttl_seconds', toInt(form.storage.disk.cache.ttl_seconds));
	set('storage.disk.cache.max_file_size_mbytes', toInt(form.storage.disk.cache.max_file_size_mbytes));
	set('storage.disk.cache.types.allow', toArray(form.storage.disk.cache.types.allow, '\n'));
	set('storage.disk.cache.types.block', toArray(form.storage.disk.cache.types.block, '\n'));
	set('storage.memory.auth.enable', form.storage.memory.auth.enable);
	set('storage.memory.auth.username', form.storage.memory.auth.username);
	set('storage.memory.auth.password', form.storage.memory.auth.password);
	set('storage.memory.max_size_mbytes', toInt(form.storage.memory.max_size_mbytes));
	set('storage.memory.purge', form.storage.memory.purge);

	set('sessions.enable', form.sessions.enable);
	set('sessions.ip_ignorelist', toArray(form.sessions.ip_ignorelist, '\n'));
	set('sessions.session_timeout_sec', toInt(form.sessions.session_timeout_sec));
	set('sessions.persist', form.sessions.persist);
	set('sessions.max_bitrate_mbit', toInt(form.sessions.max_bitrate_mbit));
	set('sessions.max_sessions', toInt(form.sessions.max_sessions));

	set('service.enable', form.service.enable);
	set('service.token', form.service.token);

	for (const what of overrides) {
		if (isConfigValue(what)) {
			deletePath(payload, what);
		}
	}

	return payload;
}

/** The custom JSON config of the Service tab; when given it is saved instead of the form. */
export function parseCoreConfig(text: string): { config: CoreConfig; error: null } | { config: null; error: string } {
	try {
		return { config: JSON.parse(text) as CoreConfig, error: null };
	} catch (e) {
		return { config: null, error: e instanceof Error ? e.message : String(e) };
	}
}

/** The core has not yet loaded the config that was last saved: a restart is pending. */
export function isOutdated(data: Pick<CoreConfigResponse, 'loaded_at' | 'updated_at'>): boolean {
	if (data.loaded_at === null || data.updated_at === null) return false;
	return data.loaded_at < data.updated_at;
}

// Validation

export const MSG_ONLY_DOMAINS = 'Only domains names are allowed';
export const MSG_CACHE_SIZE = 'Must be larger than maximum file size in cache.';
export const MSG_CACHE_FILE_SIZE = 'Must be smaller than maximum cache size.';
export const MSG_SRT_PASSPHRASE = 'Passphrase must be between 10 and 79 characters long';
export const SRT_PASSPHRASE_MAX = 79;

/**
 * The rules the legacy view applied in the browser. As there, they inform but do not block
 * saving; the core has the last word (see saveErrorMessages()).
 */
export function validateForm(form: SettingsForm): SettingsMessage[] {
	const messages: SettingsMessage[] = [];
	const add = (configvalue: ConfigValue, error: string) => messages.push({ configvalue, error, translate: true });

	// Let's Encrypt only issues certificates for domain names. The first pattern is the legacy
	// one and also rejects names with a label that ends in a digit ("stream1.example.com").
	if (form.tls.auto !== false) {
		const names = toArray(form.host.name, ',').filter((name) => name.match(/([0-9]+\.)+/) !== null || name.match(/[:/]/) !== null);
		if (names.length !== 0) {
			add('host.name', MSG_ONLY_DOMAINS);
		}
	}

	const cacheSize = parseInt(String(form.storage.disk.cache.max_size_mbytes));
	const cacheFileSize = parseInt(String(form.storage.disk.cache.max_file_size_mbytes));
	if (cacheFileSize > cacheSize && cacheSize !== 0) {
		add('storage.disk.cache.max_size_mbytes', MSG_CACHE_SIZE);
		add('storage.disk.cache.max_file_size_mbytes', MSG_CACHE_FILE_SIZE);
	}

	if (form.srt.passphrase && form.srt.passphrase.length < 10) {
		add('srt.passphrase', MSG_SRT_PASSPHRASE);
	}

	return messages;
}

// Saving

/** The error half of `restreamer.ConfigSet()`; for a 409 the message maps config values to their errors. */
export interface ConfigSetError {
	code: number;
	message: unknown;
}

export function saveErrorNotice(code: number): string {
	if (code === 404) return 'API endpoint not found. Settings not saved.';
	if (code === 409) return 'There were some errors in the settings. Settings not saved.';
	return 'There was a problem storing the settings. Settings not saved.';
}

const ucfirst = (string: string): string => string.charAt(0).toUpperCase() + string.slice(1);

/** What the core objected to, per config value (409) or for the custom JSON config (400). */
export function saveErrorMessages(err: ConfigSetError): SettingsMessage[] {
	const messages: SettingsMessage[] = [];

	if (err.code === 409 && isObject(err.message)) {
		for (const [errorfield, errors] of Object.entries(err.message)) {
			if (!isConfigValue(errorfield) || !Array.isArray(errors)) continue;

			for (const m of errors) {
				messages.push({ configvalue: errorfield, error: ucfirst(String(m)) });
			}
		}
	} else if (err.code === 400) {
		messages.push({ configvalue: CORE_CONFIG_FIELD, error: typeof err.message === 'string' ? err.message : JSON.stringify(err.message) });
	}

	return messages;
}

// Tabs

const TAB_ORDER: SettingsTab[] = ['general', 'service', 'network', 'auth', 'playback', 'storage', 'rtmp', 'srt', 'logging'];
const EXPERT_TABS: SettingsTab[] = ['playback', 'storage', 'logging'];

/** Playback, Storage and Logging are for experts; Service needs a core that announces the service. */
export function visibleTabs(options: { expert: boolean; service: boolean }): SettingsTab[] {
	return TAB_ORDER.filter((tab) => {
		if (tab === 'service') return options.service;
		if (EXPERT_TABS.includes(tab)) return options.expert;
		return true;
	});
}

export function tabsWithErrors(messages: SettingsMessage[]): Set<SettingsTab> {
	const tabs = new Set<SettingsTab>();
	for (const m of messages) {
		const tab = tabOf(m.configvalue);
		if (tab !== null) tabs.add(tab);
	}

	return tabs;
}

// Change tracking

function flatten(value: unknown, prefix: string, out: Record<string, unknown>): Record<string, unknown> {
	if (isObject(value)) {
		for (const [key, child] of Object.entries(value)) {
			flatten(child, prefix === '' ? key : prefix + '.' + key, out);
		}
	} else {
		out[prefix] = value;
	}

	return out;
}

/** The config values that differ between two states of the form. */
export function changedValues(before: SettingsForm, after: SettingsForm): string[] {
	const a = flatten(before, '', {});
	const b = flatten(after, '', {});

	return Object.keys(b).filter((key) => a[key] !== b[key]);
}

// Restart

/** Seconds to wait for the core to come back after a reload. */
export const RETRIES = 60;

export interface AboutLike {
	id: string;
	created_at: Date | null;
}

/** Identifies a run of the core: its start time. '' if the core does not tell. */
export function reloadKeyOf(createdAt: Date | null | undefined): string {
	if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) return '';
	return createdAt.toISOString();
}

export function hasRestarted(about: AboutLike | null, reloadKey: string): boolean {
	if (about === null) {
		// API is not yet available
		return false;
	}

	if (about.id.length === 0) {
		// The API requires a login and after the restart the token
		// is not valid anymore. This means the restart happened.
		return true;
	}

	// The API tells us that it changed from before. This means the restart happened.
	const currentKey = about.created_at !== null ? reloadKeyOf(about.created_at) : reloadKey;
	return reloadKey !== currentKey;
}

/** Asks the core once a second who it is until it is a new run. False if it did not return in time. */
export async function waitForRestart(options: {
	about: () => Promise<AboutLike | null>;
	reloadKey: string;
	retries?: number;
	wait?: (ms: number) => Promise<void>;
}): Promise<boolean> {
	const wait = options.wait ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
	const retries = options.retries ?? RETRIES;

	for (let retry = 0; retry <= retries; retry++) {
		await wait(1000);

		if (hasRestarted(await options.about(), options.reloadKey)) {
			return true;
		}
	}

	return false;
}

// Help

const DOCS = 'https://docs.datarhei.com/restreamer';

const HELP_TOPICS: Record<string, { en: string; de: string }> = {
	general: {
		en: DOCS + '/knowledge-base/manual/system-settings/general-system-settings',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/allgemeine-systemeinstellungen',
	},
	'update-link': {
		en: DOCS + '/installing/update',
		de: DOCS + '/v/de/installation/aktualisieren',
	},
	service: {
		en: DOCS + '/knowledge-base/manual/system-settings/service',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/service',
	},
	network: {
		en: DOCS + '/knowledge-base/manual/system-settings/network',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/netzwerk',
	},
	auth: {
		en: DOCS + '/knowledge-base/manual/system-settings/authorization',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/autorisierung',
	},
	playback: {
		en: DOCS + '/knowledge-base/manual/system-settings/playback',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/wiedergabe',
	},
	storage: {
		en: DOCS + '/knowledge-base/manual/system-settings/disk-space',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/speicherplatz',
	},
	rtmp: {
		en: DOCS + '/knowledge-base/manual/system-settings/rtmp',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/rtmp',
	},
	srt: {
		en: DOCS + '/knowledge-base/manual/system-settings/srt',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/srt',
	},
	logging: {
		en: DOCS + '/knowledge-base/manual/system-settings/logging',
		de: DOCS + '/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/protokollierung-and-fehlersuche',
	},
};

/** The manual page of a settings tab (legacy utils/help.js, topics "settings-*"). */
export function helpUrl(topic: string, locale: string): string {
	const urls = HELP_TOPICS[topic];
	if (!urls) return DOCS;
	return locale === 'de' ? urls.de : urls.en;
}
