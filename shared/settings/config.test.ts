import { describe, expect, test } from 'bun:test';

import {
	CONFIG_VALUE_TABS,
	MSG_CACHE_FILE_SIZE,
	MSG_CACHE_SIZE,
	MSG_ONLY_DOMAINS,
	MSG_SRT_PASSPHRASE,
	RETRIES,
	changedValues,
	formatListenAddress,
	hasRestarted,
	helpUrl,
	isOutdated,
	parseCoreConfig,
	parseListenAddress,
	reloadKeyOf,
	saveErrorMessages,
	saveErrorNotice,
	tabOf,
	tabsWithErrors,
	toArray,
	toForm,
	toInt,
	toPayload,
	validateForm,
	visibleTabs,
	waitForRestart,
	type CoreConfig,
	type SettingsForm,
} from './config';

// A config as datarhei-core v16 returns it from GET /v3/config (shortened to what matters).
const coreConfig = (): CoreConfig => ({
	version: 3,
	id: 'core-0001',
	name: 'my-core',
	address: ':8080',
	update_check: true,
	log: { level: 'info', topics: [], max_lines: 1000 },
	db: { dir: './config' },
	host: { name: ['example.com', 'www.example.com'], auto: true },
	api: {
		read_only: false,
		auth: { enable: true, disable_localhost: false, username: 'admin', password: 'secret', jwt: { secret: 'jwt-secret' } },
	},
	tls: { address: ':8181', enable: false, auto: false, email: 'cert@datarhei.com', cert_file: '', key_file: '' },
	storage: {
		disk: {
			dir: './data',
			max_size_mbytes: 0,
			cache: { enable: true, max_size_mbytes: 0, ttl_seconds: 300, max_file_size_mbytes: 1, types: { allow: [], block: ['.m3u8', '.mpd'] } },
		},
		memory: { auth: { enable: true, username: 'mem', password: 'mempass' }, max_size_mbytes: 0, purge: false },
		cors: { origins: ['*'] },
		mimetypes_file: './mime.types',
	},
	rtmp: { enable: true, enable_tls: false, address: ':1935', address_tls: ':1936', app: '/', token: '' },
	srt: { enable: true, address: ':6000', passphrase: '', token: '', log: { enable: false, topics: [] } },
	ffmpeg: { binary: 'ffmpeg', max_processes: 0, log: { max_lines: 50, max_history: 3 } },
	sessions: {
		enable: true,
		ip_ignorelist: ['127.0.0.1/32', '::1/128'],
		session_timeout_sec: 30,
		persist: false,
		persist_interval_sec: 300,
		max_bitrate_mbit: 0,
		max_sessions: 0,
	},
	service: { enable: false, token: '', url: 'https://service.datarhei.com' },
});

const form = (change?: (form: SettingsForm) => void): SettingsForm => {
	const f = toForm(coreConfig());
	change?.(f);
	return f;
};

describe('helpers', () => {
	test('toArray trims and drops empty entries', () => {
		expect(toArray(' a.com, b.com ,,', ',')).toEqual(['a.com', 'b.com']);
		expect(toArray('one\n\n two \n', '\n')).toEqual(['one', 'two']);
		expect(toArray('', ',')).toEqual([]);
	});

	test('toInt: an empty input is 0, a string is parsed, a number passes', () => {
		expect(toInt('')).toBe(0);
		expect(toInt('42')).toBe(42);
		expect(toInt('12.7')).toBe(12);
		expect(toInt(7)).toBe(7);
	});

	test('a listen address is split at its last colon', () => {
		expect(parseListenAddress(':8080')).toEqual({ host: '', port: '8080' });
		expect(parseListenAddress('127.0.0.1:8080')).toEqual({ host: '127.0.0.1', port: '8080' });
		expect(parseListenAddress('[::1]:8080')).toEqual({ host: '[::1]', port: '8080' });
		expect(parseListenAddress('8080')).toEqual({ host: '', port: '8080' });
		expect(parseListenAddress('')).toEqual({ host: '', port: '' });
	});

	test('formatListenAddress puts host and port back together', () => {
		expect(formatListenAddress('', '8080')).toBe(':8080');
		expect(formatListenAddress('', 8080)).toBe(':8080');
		expect(formatListenAddress('127.0.0.1', 9000)).toBe('127.0.0.1:9000');
	});
});

describe('toForm', () => {
	test('converts the core config into the form model', () => {
		expect(toForm(coreConfig())).toEqual({
			update_check: true,
			id: 'core-0001',
			name: 'my-core',
			address: '8080',
			host: { name: 'example.com, www.example.com' },
			log: { level: 'info', max_lines: 1000 },
			tls: { address: '8181', auto: false, email: 'cert@datarhei.com' },
			api: { auth: { enable: true, username: 'admin', password: 'secret' } },
			rtmp: { enable: true, enable_tls: false, address: '1935', address_tls: '1936', app: '/', token: '' },
			srt: { enable: true, address: '6000', passphrase: '', token: '' },
			ffmpeg: { log: { max_lines: 50, max_history: 3 } },
			storage: {
				cors: { allow_all: true, origins: '*' },
				disk: {
					max_size_mbytes: 0,
					cache: { enable: true, max_size_mbytes: 0, ttl_seconds: 300, max_file_size_mbytes: 1, types: { allow: '', block: '.m3u8\n.mpd' } },
				},
				memory: { auth: { enable: true, username: 'mem', password: 'mempass' }, max_size_mbytes: 0, purge: false },
			},
			sessions: {
				enable: true,
				ip_ignorelist: '127.0.0.1/32\n::1/128',
				session_timeout_sec: 30,
				persist: false,
				max_bitrate_mbit: 0,
				max_sessions: 0,
			},
			service: { enable: false, token: '' },
		});
	});

	test('"allow all referrer" is only the single origin *', () => {
		const config = coreConfig();
		(config.storage as { cors: { origins: string[] } }).cors.origins = ['*', 'https://a.example'];
		expect(toForm(config).storage.cors).toEqual({ allow_all: false, origins: '*\nhttps://a.example' });

		(config.storage as { cors: { origins: string[] } }).cors.origins = [];
		expect(toForm(config).storage.cors).toEqual({ allow_all: false, origins: '' });
	});

	test('auto TLS without TLS is shown as off', () => {
		const config = coreConfig();
		config.tls = { address: ':8181', enable: false, auto: true, email: '' };
		expect(toForm(config).tls.auto).toBe(false);

		config.tls = { address: ':8181', enable: true, auto: true, email: '' };
		expect(toForm(config).tls.auto).toBe(true);
	});

	test('values the core leaves out start empty instead of failing', () => {
		const f = toForm({ address: ':8080' });
		expect(f.address).toBe('8080');
		expect(f.host.name).toBe('');
		expect(f.log).toEqual({ level: '', max_lines: 0 });
		expect(f.storage.disk.cache.types).toEqual({ allow: '', block: '' });
		expect(f.sessions.ip_ignorelist).toBe('');
	});
});

describe('toPayload', () => {
	test('an untouched form round-trips to the config it came from', () => {
		expect(toPayload(coreConfig(), toForm(coreConfig()))).toEqual(coreConfig());
	});

	test('does not modify the loaded config', () => {
		const config = coreConfig();
		toPayload(
			config,
			form((f) => {
				f.name = 'other';
				f.address = 9090;
			}),
		);
		expect(config).toEqual(coreConfig());
	});

	test('writes the edited values back in the shape of the core', () => {
		const payload = toPayload(
			coreConfig(),
			form((f) => {
				f.host.name = ' a.example.com ,b.example.com,, ';
				f.address = 80;
				f.tls.address = '443';
				f.rtmp.address = '11935';
				f.rtmp.address_tls = 11936;
				f.srt.address = '7000';
				f.rtmp.app = 'live';
				f.log.max_lines = '';
				f.ffmpeg.log.max_lines = '200';
				f.ffmpeg.log.max_history = '';
				f.storage.disk.max_size_mbytes = '5000';
				f.storage.disk.cache.max_size_mbytes = '100';
				f.storage.disk.cache.ttl_seconds = '60';
				f.storage.disk.cache.max_file_size_mbytes = '2';
				f.storage.disk.cache.types.allow = '.html\n\n .css ';
				f.storage.disk.cache.types.block = '';
				f.storage.memory.max_size_mbytes = '512';
				f.sessions.ip_ignorelist = '10.0.0.0/8\n';
				f.sessions.session_timeout_sec = '45';
				f.sessions.max_bitrate_mbit = '250';
				f.sessions.max_sessions = '';
			}),
		);

		expect(payload.host).toEqual({ name: ['a.example.com', 'b.example.com'], auto: true });
		expect(payload.address).toBe(':80');
		expect((payload.tls as CoreConfig).address).toBe(':443');
		expect(payload.rtmp).toEqual({ enable: true, enable_tls: false, address: ':11935', address_tls: ':11936', app: '/live', token: '' });
		expect((payload.srt as CoreConfig).address).toBe(':7000');
		expect(payload.log).toEqual({ level: 'info', topics: [], max_lines: 0 });
		expect((payload.ffmpeg as CoreConfig).log).toEqual({ max_lines: 200, max_history: 0 });
		expect((payload.storage as CoreConfig).disk).toEqual({
			dir: './data',
			max_size_mbytes: 5000,
			cache: { enable: true, max_size_mbytes: 100, ttl_seconds: 60, max_file_size_mbytes: 2, types: { allow: ['.html', '.css'], block: [] } },
		});
		expect(((payload.storage as CoreConfig).memory as CoreConfig).max_size_mbytes).toBe(512);
		expect(payload.sessions).toEqual({
			enable: true,
			ip_ignorelist: ['10.0.0.0/8'],
			session_timeout_sec: 45,
			persist: false,
			persist_interval_sec: 300,
			max_bitrate_mbit: 250,
			max_sessions: 0,
		});
	});

	test('an RTMP app that starts with a slash is kept', () => {
		const app = (value: string) =>
			(
				toPayload(
					coreConfig(),
					form((f) => (f.rtmp.app = value)),
				).rtmp as CoreConfig
			).app;
		expect(app('/live')).toBe('/live');
		expect(app('')).toBe('/');
	});

	test('"allow all referrer" replaces the origins by *, and is not sent itself', () => {
		const cors = (allow_all: boolean, origins: string) =>
			(
				toPayload(
					coreConfig(),
					form((f) => {
						f.storage.cors = { allow_all, origins };
					}),
				).storage as CoreConfig
			).cors;

		expect(cors(true, 'https://a.example')).toEqual({ origins: ['*'] });
		expect(cors(false, 'https://a.example\nhttps://b.example\n')).toEqual({ origins: ['https://a.example', 'https://b.example'] });
	});

	test("tls.enable follows Let's Encrypt", () => {
		const tls = (config: CoreConfig, auto: boolean) => {
			const f = toForm(config);
			f.tls.auto = auto;
			return toPayload(config, f).tls as CoreConfig;
		};

		expect(tls(coreConfig(), true)).toMatchObject({ enable: true, auto: true });
		expect(tls(coreConfig(), false)).toMatchObject({ enable: false, auto: false });

		const withLetsEncrypt = coreConfig();
		withLetsEncrypt.tls = { address: ':8181', enable: true, auto: true, email: '' };
		expect(tls(withLetsEncrypt, false)).toMatchObject({ enable: false, auto: false });
	});

	// New behaviour: legacy wrote tls.enable = tls.auto and so disabled this setup on every save.
	test('TLS with own certificates (enable without auto) stays enabled', () => {
		const config = coreConfig();
		config.tls = { address: ':8181', enable: true, auto: false, email: '', cert_file: '/cert.pem', key_file: '/key.pem' };

		expect(toPayload(config, toForm(config))).toEqual(config);
	});

	// New behaviour: legacy merged host and port into the port (":127.0.0.18080").
	test('the host of a listen address is kept, only the port is edited', () => {
		const config = coreConfig();
		config.address = '127.0.0.1:8080';
		(config.srt as CoreConfig).address = '[::1]:6000';

		const f = toForm(config);
		expect(f.address).toBe('8080');
		expect(f.srt.address).toBe('6000');
		expect(toPayload(config, f)).toEqual(config);

		f.address = 9090;
		const payload = toPayload(config, f);
		expect(payload.address).toBe('127.0.0.1:9090');
		expect((payload.srt as CoreConfig).address).toBe('[::1]:6000');
	});

	test('values set by an environment variable are left out', () => {
		const payload = toPayload(coreConfig(), toForm(coreConfig()), [
			'address',
			'api.auth.password',
			'storage.disk.cache.types.allow',
			'storage.cors.origins',
			// Not values of the form: they stay.
			'tls.enable',
			'db.dir',
		]);

		expect('address' in payload).toBe(false);
		expect((payload.api as CoreConfig).auth).toEqual({
			enable: true,
			disable_localhost: false,
			username: 'admin',
			jwt: { secret: 'jwt-secret' },
		});
		expect((((payload.storage as CoreConfig).disk as CoreConfig).cache as CoreConfig).types).toEqual({ block: ['.m3u8', '.mpd'] });
		expect((payload.storage as CoreConfig).cors).toEqual({});
		expect((payload.tls as CoreConfig).enable).toBe(false);
		expect(payload.db).toEqual({ dir: './config' });
	});
});

describe('parseCoreConfig', () => {
	test('returns the parsed custom config', () => {
		expect(parseCoreConfig('{"name":"x","rtmp":{"enable":false}}')).toEqual({ config: { name: 'x', rtmp: { enable: false } }, error: null });
	});

	test('reports invalid JSON', () => {
		const result = parseCoreConfig('{"name":');
		expect(result.config).toBeNull();
		expect(typeof result.error).toBe('string');
		expect((result.error as string).length).toBeGreaterThan(0);
	});
});

describe('isOutdated', () => {
	const at = (iso: string) => new Date(iso);

	test('the config was saved after the core loaded it', () => {
		expect(isOutdated({ loaded_at: at('2026-01-02T03:04:06Z'), updated_at: at('2026-01-02T03:04:07Z') })).toBe(true);
	});

	test('the core runs with the stored config', () => {
		expect(isOutdated({ loaded_at: at('2026-01-02T03:04:07Z'), updated_at: at('2026-01-02T03:04:07Z') })).toBe(false);
		expect(isOutdated({ loaded_at: at('2026-01-02T03:04:08Z'), updated_at: at('2026-01-02T03:04:07Z') })).toBe(false);
		expect(isOutdated({ loaded_at: null, updated_at: at('2026-01-02T03:04:07Z') })).toBe(false);
	});
});

describe('validateForm', () => {
	const errorsOf = (f: SettingsForm) => validateForm(f).map((m) => [m.configvalue, m.error]);

	test('the default config is valid', () => {
		expect(validateForm(form())).toEqual([]);
	});

	test("host.name: with Let's Encrypt only domain names are allowed", () => {
		const hostErrors = (name: string, auto = true) =>
			errorsOf(
				form((f) => {
					f.host.name = name;
					f.tls.auto = auto;
				}),
			);

		expect(hostErrors('example.com, www.example.com')).toEqual([]);
		expect(hostErrors('')).toEqual([]);
		expect(hostErrors('192.168.1.1')).toEqual([['host.name', MSG_ONLY_DOMAINS]]);
		expect(hostErrors('example.com, 10.0.0.1')).toEqual([['host.name', MSG_ONLY_DOMAINS]]);
		expect(hostErrors('example.com:8080')).toEqual([['host.name', MSG_ONLY_DOMAINS]]);
		expect(hostErrors('https://example.com')).toEqual([['host.name', MSG_ONLY_DOMAINS]]);
		expect(hostErrors('example.com/path')).toEqual([['host.name', MSG_ONLY_DOMAINS]]);
		// As in legacy, a label that ends in a digit looks like an IP address to the rule.
		expect(hostErrors('stream1.example.com')).toEqual([['host.name', MSG_ONLY_DOMAINS]]);
		expect(hostErrors('stream-1a.example.com')).toEqual([]);
	});

	test("host.name: anything goes without Let's Encrypt", () => {
		expect(
			errorsOf(
				form((f) => {
					f.host.name = '192.168.1.1, example.com:8080';
					f.tls.auto = false;
				}),
			),
		).toEqual([]);
	});

	test('disk cache: a file may not be larger than the cache', () => {
		const cacheErrors = (size: number | string, fileSize: number | string) =>
			errorsOf(
				form((f) => {
					f.storage.disk.cache.max_size_mbytes = size;
					f.storage.disk.cache.max_file_size_mbytes = fileSize;
				}),
			);

		const both = [
			['storage.disk.cache.max_size_mbytes', MSG_CACHE_SIZE],
			['storage.disk.cache.max_file_size_mbytes', MSG_CACHE_FILE_SIZE],
		];

		expect(cacheErrors(10, 20)).toEqual(both);
		expect(cacheErrors('10', '20')).toEqual(both);
		expect(cacheErrors(20, 20)).toEqual([]);
		expect(cacheErrors(20, 10)).toEqual([]);
		// 0 = unlimited cache
		expect(cacheErrors(0, 20)).toEqual([]);
		expect(cacheErrors('0', '20')).toEqual([]);
		// An emptied input compares as NaN and raises nothing.
		expect(cacheErrors('', 20)).toEqual([]);
		expect(cacheErrors(10, '')).toEqual([]);
	});

	test('srt.passphrase: empty or at least 10 characters', () => {
		const passphraseErrors = (passphrase: string) => errorsOf(form((f) => (f.srt.passphrase = passphrase)));

		expect(passphraseErrors('')).toEqual([]);
		expect(passphraseErrors('123456789')).toEqual([['srt.passphrase', MSG_SRT_PASSPHRASE]]);
		expect(passphraseErrors('1234567890')).toEqual([]);
	});

	test('the rules are marked as translatable', () => {
		expect(validateForm(form((f) => (f.srt.passphrase = 'short')))).toEqual([
			{ configvalue: 'srt.passphrase', error: MSG_SRT_PASSPHRASE, translate: true },
		]);
	});
});

describe('save errors', () => {
	test('the notice says why nothing was saved', () => {
		expect(saveErrorNotice(404)).toBe('API endpoint not found. Settings not saved.');
		expect(saveErrorNotice(409)).toBe('There were some errors in the settings. Settings not saved.');
		expect(saveErrorNotice(400)).toBe('There was a problem storing the settings. Settings not saved.');
		expect(saveErrorNotice(500)).toBe('There was a problem storing the settings. Settings not saved.');
	});

	test('409: one message per error of a known config value, capitalised', () => {
		expect(
			saveErrorMessages({
				code: 409,
				message: {
					address: ['invalid port', 'port already in use'],
					'srt.passphrase': ['passphrase too short'],
					'db.dir': ['not a config value of the form'],
				},
			}),
		).toEqual([
			{ configvalue: 'address', error: 'Invalid port' },
			{ configvalue: 'address', error: 'Port already in use' },
			{ configvalue: 'srt.passphrase', error: 'Passphrase too short' },
		]);
	});

	test('400: the custom JSON config was rejected', () => {
		expect(saveErrorMessages({ code: 400, message: 'invalid JSON' })).toEqual([{ configvalue: 'coreconfig', error: 'invalid JSON' }]);
	});

	test('other errors carry no field messages', () => {
		expect(saveErrorMessages({ code: 404, message: 'Not Found' })).toEqual([]);
		expect(saveErrorMessages({ code: 409, message: 'Conflict' })).toEqual([]);
		expect(saveErrorMessages({ code: -1, message: 'Failed to fetch' })).toEqual([]);
	});
});

describe('tabs', () => {
	test('which tabs are visible depends on expert mode and the service (servers and protocols are expert matters, unlike legacy)', () => {
		expect(visibleTabs({ expert: false, service: false })).toEqual(['general', 'auth']);
		expect(visibleTabs({ expert: false, service: true })).toEqual(['general', 'service', 'auth']);
		// a tab a link leads to, or one with an error, shows in any mode; the service tab still needs the service
		expect(visibleTabs({ expert: false, service: false, keep: ['rtmp', 'service'] })).toEqual(['general', 'auth', 'rtmp']);
		expect(visibleTabs({ expert: true, service: false })).toEqual(['general', 'network', 'auth', 'playback', 'storage', 'rtmp', 'srt', 'logging']);
		expect(visibleTabs({ expert: true, service: true })).toEqual([
			'general',
			'service',
			'network',
			'auth',
			'playback',
			'storage',
			'rtmp',
			'srt',
			'logging',
		]);
	});

	test('a config value belongs to the tab it is edited on', () => {
		expect(tabOf('update_check')).toBe('general');
		expect(tabOf('host.name')).toBe('network');
		expect(tabOf('sessions.max_sessions')).toBe('network');
		expect(tabOf('sessions.enable')).toBe('playback');
		expect(tabOf('api.auth.password')).toBe('auth');
		expect(tabOf('storage.memory.purge')).toBe('storage');
		expect(tabOf('rtmp.token')).toBe('rtmp');
		expect(tabOf('srt.passphrase')).toBe('srt');
		expect(tabOf('ffmpeg.log.max_history')).toBe('logging');
		expect(tabOf('service.token')).toBe('service');
		expect(tabOf('coreconfig')).toBe('service');
		expect(tabOf('db.dir')).toBeNull();
	});

	// New behaviour: legacy filed the CORS origins under "storage" but showed them on Playback.
	test('the CORS origins belong to the Playback tab', () => {
		expect(CONFIG_VALUE_TABS['storage.cors.origins']).toBe('playback');
		expect(CONFIG_VALUE_TABS['storage.cors.allow_all']).toBe('playback');
	});

	test('tabsWithErrors collects the tabs of the messages', () => {
		expect(
			tabsWithErrors([
				{ configvalue: 'address', error: 'x' },
				{ configvalue: 'host.name', error: 'x' },
				{ configvalue: 'coreconfig', error: 'x' },
				{ configvalue: 'unknown', error: 'x' },
			]),
		).toEqual(new Set(['network', 'service'] as const));
		expect(tabsWithErrors([])).toEqual(new Set());
	});
});

describe('changedValues', () => {
	test('names the config values that differ', () => {
		const after = form((f) => {
			f.rtmp.enable = false;
			f.storage.disk.cache.types.allow = '.html';
			f.address = 8080;
		});

		// '8080' -> 8080 is a change of the input, too.
		expect(changedValues(form(), after).sort()).toEqual(['address', 'rtmp.enable', 'storage.disk.cache.types.allow']);
		expect(changedValues(form(), form())).toEqual([]);
	});
});

describe('restart', () => {
	const startedAt = new Date('2026-01-02T03:04:05.000Z');
	const key = reloadKeyOf(startedAt);

	test('reloadKeyOf is the start time of the core, or empty', () => {
		expect(key).toBe('2026-01-02T03:04:05.000Z');
		expect(reloadKeyOf(null)).toBe('');
		expect(reloadKeyOf(undefined)).toBe('');
		expect(reloadKeyOf(new Date('nonsense'))).toBe('');
	});

	test('hasRestarted', () => {
		// API is not yet available
		expect(hasRestarted(null, key)).toBe(false);
		// Same run
		expect(hasRestarted({ id: 'core-0001', created_at: startedAt }, key)).toBe(false);
		expect(hasRestarted({ id: 'core-0001', created_at: null }, key)).toBe(false);
		// The token is not valid anymore
		expect(hasRestarted({ id: '', created_at: null }, key)).toBe(true);
		// A new run
		expect(hasRestarted({ id: 'core-0001', created_at: new Date('2026-01-02T03:05:00.000Z') }, key)).toBe(true);
	});

	test('waitForRestart polls once a second until the core is a new run', async () => {
		const waits: number[] = [];
		const answers = [null, null, { id: 'core-0001', created_at: startedAt }, { id: 'core-0001', created_at: new Date('2026-01-02T03:05:00.000Z') }];
		let calls = 0;

		const restarted = await waitForRestart({
			about: async () => answers[calls++] ?? null,
			reloadKey: key,
			wait: async (ms) => {
				waits.push(ms);
			},
		});

		expect(restarted).toBe(true);
		expect(calls).toBe(4);
		expect(waits).toEqual([1000, 1000, 1000, 1000]);
	});

	test('waitForRestart gives up after RETRIES + 1 attempts', async () => {
		let calls = 0;

		const restarted = await waitForRestart({
			about: async () => {
				calls++;
				return null;
			},
			reloadKey: key,
			wait: async () => {},
		});

		expect(RETRIES).toBe(60);
		expect(restarted).toBe(false);
		expect(calls).toBe(61);
	});
});

describe('helpUrl', () => {
	test('links the manual page of a tab in English or German', () => {
		expect(helpUrl('network', 'en')).toBe('https://docs.datarhei.com/restreamer/knowledge-base/manual/system-settings/network');
		expect(helpUrl('network', 'de')).toBe('https://docs.datarhei.com/restreamer/v/de/wissensdatenbank/user-guides/restreamer-einstellungen/netzwerk');
		expect(helpUrl('network', 'fr')).toBe('https://docs.datarhei.com/restreamer/knowledge-base/manual/system-settings/network');
		expect(helpUrl('update-link', 'en')).toBe('https://docs.datarhei.com/restreamer/installing/update');
		expect(helpUrl('nope', 'en')).toBe('https://docs.datarhei.com/restreamer');
	});
});
