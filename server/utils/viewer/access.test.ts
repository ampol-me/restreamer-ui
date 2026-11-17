import { describe, expect, test } from 'bun:test';

import { defaultTemplate, sanitizePresets, sanitizeTemplate } from '../../../shared/viewer/template';
import { checkUnlock, decodeGrants, encodeGrants, grantValid, mergeGrants, noLimits, sanitizeLimits, type ChannelRule, type Grant } from './access';
import { adminView, applyChannelUpdate, applyUpdate, ConfigError, emptyConfig, migratePortal, normalizeConfig, referencedImages } from './config';
import { hashPasscode } from './passcode';
import { Presence } from './presence';

const now = Date.parse('2026-11-17T12:00:00Z');

const rule = (over: Partial<ChannelRule> = {}): ChannelRule => ({
	channelid: 'chan-a',
	access: 'passcode',
	passcode: hashPasscode('482913'),
	codeRevision: 2,
	limits: noLimits(),
	uses: 0,
	...over,
});

describe('unlocking a channel', () => {
	test('the right passcode opens it, a wrong one does not', () => {
		expect(checkUnlock(rule(), '482913', now, 0)).toEqual({ ok: true });
		expect(checkUnlock(rule(), '482914', now, 0)).toEqual({ ok: false, reason: 'wrong' });
	});

	test('public, hidden and unknown channels take no passcode', () => {
		expect(checkUnlock(rule({ access: 'public' }), '482913', now, 0)).toEqual({ ok: false, reason: 'not-found' });
		expect(checkUnlock(rule({ access: 'hidden' }), '482913', now, 0)).toEqual({ ok: false, reason: 'not-found' });
		expect(checkUnlock(undefined, '482913', now, 0)).toEqual({ ok: false, reason: 'not-found' });
	});

	test('expiry: the passcode stops working at the set moment', () => {
		const expiring = rule({ limits: { ...noLimits(), expiresAt: '2026-11-17T12:00:00.000Z' } });
		expect(checkUnlock(expiring, '482913', now - 1, 0)).toEqual({ ok: true });
		expect(checkUnlock(expiring, '482913', now, 0)).toEqual({ ok: false, reason: 'expired' });
	});

	test('use limit: the passcode works that many times', () => {
		const limited = (uses: number) => rule({ uses, limits: { ...noLimits(), maxUses: 3 } });
		expect(checkUnlock(limited(2), '482913', now, 0)).toEqual({ ok: true });
		expect(checkUnlock(limited(3), '482913', now, 0)).toEqual({ ok: false, reason: 'exhausted' });
	});

	test('viewer limit: no entry while every seat is taken', () => {
		const limited = rule({ limits: { ...noLimits(), maxViewers: 2 } });
		expect(checkUnlock(limited, '482913', now, 1)).toEqual({ ok: true });
		expect(checkUnlock(limited, '482913', now, 2)).toEqual({ ok: false, reason: 'full' });
	});

	test('a wrong passcode learns nothing about the limits', () => {
		const spent = rule({ uses: 9, limits: { maxViewers: 1, maxUses: 1, expiresAt: '2020-01-01T00:00:00.000Z' } });
		expect(checkUnlock(spent, '000000', now, 5)).toEqual({ ok: false, reason: 'wrong' });
	});
});

describe('grants', () => {
	const secret = 'a'.repeat(64);
	const grant: Grant = { c: 'chan-a', r: 2, e: now + 1000, s: 'sess1' };

	test('cookie round trip', () => {
		expect(decodeGrants(encodeGrants([grant], secret), secret)).toEqual([grant]);
	});

	test('tampered, foreign and malformed cookies yield nothing', () => {
		const token = encodeGrants([grant], secret);
		const forged = Buffer.from(JSON.stringify([{ ...grant, c: 'chan-b' }])).toString('base64url') + '.' + token.split('.')[1];
		for (const bad of [forged, encodeGrants([grant], 'b'.repeat(64)), token + '.x', 'abc', '', '.', undefined, null, 42]) {
			expect(decodeGrants(bad, secret)).toEqual([]);
		}
	});

	test('a grant ends with its own expiry, a new passcode, the passcode expiry, or a change of access', () => {
		expect(grantValid(grant, rule(), now)).toBe(true);
		expect(grantValid(grant, rule(), now + 1000)).toBe(false);
		expect(grantValid(grant, rule({ codeRevision: 3 }), now)).toBe(false);
		expect(grantValid(grant, rule({ limits: { ...noLimits(), expiresAt: new Date(now).toISOString() } }), now)).toBe(false);
		expect(grantValid(grant, rule({ access: 'hidden' }), now)).toBe(false);
		expect(grantValid(grant, rule({ channelid: 'chan-b' }), now)).toBe(false);
		expect(grantValid(grant, undefined, now)).toBe(false);
	});

	test('unlocking a second channel keeps the first; unlocking again replaces', () => {
		const rules = [rule(), rule({ channelid: 'chan-b', codeRevision: 0 })];
		const b: Grant = { c: 'chan-b', r: 0, e: now + 1000, s: 'sess2' };
		expect(mergeGrants([grant], b, rules, now)).toEqual([grant, b]);

		const again: Grant = { ...grant, s: 'sess3' };
		expect(mergeGrants([grant, b], again, rules, now)).toEqual([b, again]);
		// stale grants are dropped on the way
		expect(mergeGrants([{ ...b, r: 9 }], again, rules, now)).toEqual([again]);
	});
});

describe('presence (concurrent viewers)', () => {
	test('seats fill up, are kept by their holder and free up after the timeout', () => {
		const presence = new Presence(30_000);
		expect(presence.touch('c', 'one', 0, 2)).toBe(true);
		expect(presence.touch('c', 'two', 1000, 2)).toBe(true);
		expect(presence.touch('c', 'three', 2000, 2)).toBe(false);
		expect(presence.touch('c', 'one', 20_000, 2)).toBe(true);
		expect(presence.count('c', 20_000)).toBe(2);

		// "two" stopped fetching at 1000: gone at 31000, "three" gets in
		expect(presence.touch('c', 'three', 31_000, 2)).toBe(true);
		expect(presence.count('c', 31_000)).toBe(2);
	});

	test('leaving frees the seat at once; channels are counted separately; 0 = unlimited', () => {
		const presence = new Presence();
		presence.touch('c', 'one', 0, 1);
		expect(presence.touch('c', 'two', 0, 1)).toBe(false);
		expect(presence.touch('d', 'two', 0, 1)).toBe(true);
		presence.leave('c', 'one');
		expect(presence.touch('c', 'two', 0, 1)).toBe(true);

		for (let i = 0; i < 50; i++) expect(presence.touch('e', `s${i}`, 0, 0)).toBe(true);
		expect(presence.count('e', 0)).toBe(50);
		presence.clear('e');
		expect(presence.count('e', 0)).toBe(0);
	});

	test('survives a restart: restored seats hold their place, then time out like any other', () => {
		const before = new Presence(30_000);
		before.touch('c', 'one', 0, 2);
		before.touch('c', 'two', 0, 2);
		before.touch('c', 'gone', -40_000, 0);

		const after = new Presence(30_000);
		after.restore(JSON.parse(JSON.stringify(before.snapshot(1000))), 5000);
		expect(after.count('c', 5000)).toBe(2);
		expect(after.touch('c', 'new', 6000, 2)).toBe(false);
		expect(after.touch('c', 'one', 6000, 2)).toBe(true);
		// "two" never came back
		expect(after.touch('c', 'new', 35_000, 2)).toBe(true);

		after.restore('nonsense', 0);
		after.restore({ c: 'x', d: [1, null] }, 0);
		expect(after.count('d', 0)).toBe(0);
	});
});

describe('limits', () => {
	test('are whole, non-negative and bounded; bad dates are dropped', () => {
		expect(sanitizeLimits({ maxViewers: '12', maxUses: 3.9, expiresAt: '2026-12-01T10:00:00+07:00' })).toEqual({
			maxViewers: 12,
			maxUses: 3,
			expiresAt: '2026-12-01T03:00:00.000Z',
		});
		expect(sanitizeLimits({ maxViewers: -1, maxUses: 'x', expiresAt: 'soon' })).toEqual(noLimits());
		expect(sanitizeLimits(null)).toEqual(noLimits());
	});
});

describe('admin update', () => {
	const channel = { channelid: 'chan-a', name: 'A', storage: 'memfs' };

	test('a passcode channel needs a passcode; six digits only', () => {
		expect(() => applyUpdate(emptyConfig(), { channels: [{ ...channel, access: 'passcode' }] })).toThrow(ConfigError);
		expect(() => applyUpdate(emptyConfig(), { channels: [{ ...channel, access: 'passcode', passcode: '12345' }] })).toThrow(ConfigError);
	});

	test('keeps passcode, revision and uses unless a new passcode is sent', () => {
		const first = applyUpdate(emptyConfig(), { enabled: true, channels: [{ ...channel, access: 'passcode', passcode: '482913' }] });
		expect(first.changedCodes).toEqual(['chan-a']);
		const stored = { ...first.config, channels: [{ ...first.config.channels[0]!, uses: 4 }] };

		const kept = applyUpdate(stored, { enabled: true, channels: [{ ...channel, access: 'passcode', limits: { maxUses: 10 } }] });
		expect(kept.changedCodes).toEqual([]);
		expect(kept.config.channels[0]).toMatchObject({ uses: 4, codeRevision: 1, passcode: stored.channels[0]!.passcode, limits: { maxUses: 10 } });

		const reset = applyUpdate(stored, { enabled: true, channels: [{ ...channel, access: 'passcode', resetUses: true }] });
		expect(reset.config.channels[0]).toMatchObject({ uses: 0, codeRevision: 1 });

		const changed = applyUpdate(stored, { enabled: true, channels: [{ ...channel, access: 'passcode', passcode: '111111' }] });
		expect(changed.changedCodes).toEqual(['chan-a']);
		expect(changed.config.channels[0]).toMatchObject({ uses: 0, codeRevision: 2 });
	});

	test('changing one channel from its own page leaves the others, the limits and the design alone', () => {
		const start = applyUpdate(emptyConfig(), {
			enabled: false,
			title: 'Site',
			channels: [
				{ ...channel, access: 'passcode', passcode: '482913', limits: { maxViewers: 5 } },
				{ channelid: 'chan-b', name: 'B', access: 'public' },
			],
			presets: [{ name: 'Mine', template: emptyConfig().template }],
		}).config;

		// access only: passcode, limits and position stay
		const opened = applyChannelUpdate(start, { channelid: 'chan-a', access: 'public' });
		expect(opened.changedCodes).toEqual([]);
		expect(opened.config.channels.map((c) => [c.channelid, c.access])).toEqual([
			['chan-a', 'public'],
			['chan-b', 'public'],
		]);
		expect(opened.config.channels[0]).toMatchObject({ name: 'A', limits: { maxViewers: 5 }, passcode: start.channels[0]!.passcode });
		expect(opened.config).toMatchObject({ enabled: false, title: 'Site', presets: start.presets, template: start.template });

		// a new passcode for one channel does not touch the other's viewers
		const recoded = applyChannelUpdate(start, { channelid: 'chan-a', passcode: '111111' });
		expect(recoded.changedCodes).toEqual(['chan-a']);

		// a channel the site did not know yet is added; `enable` switches the site on
		const added = applyChannelUpdate(start, { channelid: 'chan-c', name: 'C', access: 'passcode', passcode: '222222' }, true);
		expect(added.config.enabled).toBe(true);
		expect(added.config.channels.map((c) => c.channelid)).toEqual(['chan-a', 'chan-b', 'chan-c']);
		expect(() => applyChannelUpdate(start, { channelid: 'chan-b', access: 'passcode' })).toThrow(ConfigError);
	});

	test('each channel can wear its own design; without one it wears the site design', () => {
		const start = applyUpdate(emptyConfig(), {
			enabled: true,
			channels: [
				{ ...channel, access: 'public' },
				{ channelid: 'chan-b', access: 'public' },
			],
		}).config;
		expect(start.channels[0]).toMatchObject({ template: null, background: '' });

		const own = { main: [{ type: 'player' }, { type: 'text', props: { body: 'Only on A' } }], side: [{ type: 'channels' }] };
		const designed = applyChannelUpdate(start, { channelid: 'chan-a', template: own, background: 'viewer-image/aaaaaaaa.png' }).config;
		expect(designed.channels[0]!.template!.main.map((b) => b.type)).toEqual(['player', 'text']);
		expect(designed.channels[0]!.background).toBe('viewer-image/aaaaaaaa.png');
		expect(designed.channels[1]).toMatchObject({ template: null, background: '' });
		expect([...referencedImages(designed)]).toEqual(['viewer-image/aaaaaaaa.png']);

		// an update that does not mention the design (the access card, the site page) keeps it
		const kept = applyChannelUpdate(designed, { channelid: 'chan-a', access: 'hidden' }).config;
		expect(kept.channels[0]!.template).toEqual(designed.channels[0]!.template);
		const viaSite = applyUpdate(designed, {
			enabled: true,
			channels: [
				{ ...channel, access: 'public' },
				{ channelid: 'chan-b', access: 'public' },
			],
		}).config;
		expect(viaSite.channels[0]!.template).toEqual(designed.channels[0]!.template);

		// null: back to the site design
		const reset = applyChannelUpdate(designed, { channelid: 'chan-a', template: null, background: '' }).config;
		expect(reset.channels[0]).toMatchObject({ template: null, background: '' });

		// presets are shared and can be saved from a channel's page
		const withPreset = applyChannelUpdate(start, { channelid: 'chan-a' }, false, [{ name: 'Mine', template: own }]).config;
		expect(withPreset.presets.map((p) => p.name)).toEqual(['Mine']);
		expect(applyChannelUpdate(withPreset, { channelid: 'chan-a' }).config.presets).toEqual(withPreset.presets);
	});

	test('the admin never gets the hashes back', () => {
		const { config } = applyUpdate(emptyConfig(), { channels: [{ ...channel, access: 'passcode', passcode: '482913' }] });
		const view = adminView(config);
		expect(view.channels[0]).toMatchObject({ hasPasscode: true, access: 'passcode' });
		expect(JSON.stringify(view)).not.toContain(config.channels[0]!.passcode!.hash);
	});

	test('drops invalid and duplicate channel ids, unknown access becomes hidden, background must be http(s) or an upload', () => {
		const { config } = applyUpdate(emptyConfig(), {
			background: 'javascript:alert(1)',
			channels: [{ channelid: '../x' }, { ...channel, access: 'everyone' }, { ...channel, access: 'public' }],
		});
		expect(config.channels.map((c) => [c.channelid, c.access])).toEqual([['chan-a', 'hidden']]);
		expect(config.background).toBe('');
		expect(applyUpdate(emptyConfig(), { background: 'viewer-image/abcdefgh12.png' }).config.background).toBe('viewer-image/abcdefgh12.png');
		expect(applyUpdate(emptyConfig(), { background: 'viewer-image/../secret' }).config.background).toBe('');
	});
});

describe('carrying over the single-passcode View Portal', () => {
	test('every portal channel keeps the portal passcode', () => {
		const passcode = hashPasscode('482913');
		const migrated = migratePortal({
			enabled: true,
			title: 'Phila Live',
			revision: 3,
			passcode,
			channels: [{ channelid: 'chan-a', name: 'A', storage: 'memfs' }],
		});
		expect(migrated).toMatchObject({ enabled: true, title: 'Phila Live' });
		expect(migrated.channels[0]).toMatchObject({ access: 'passcode', passcode, codeRevision: 3, uses: 0 });
		expect(checkUnlock(migrated.channels[0], '482913', now, 0)).toEqual({ ok: true });
	});

	test('a portal without a passcode comes over switched off with hidden channels', () => {
		const migrated = migratePortal({ enabled: true, channels: [{ channelid: 'chan-a' }] });
		expect(migrated.enabled).toBe(false);
		expect(migrated.channels[0]!.access).toBe('hidden');
	});
});

describe('template storage', () => {
	test('keeps known blocks and settings only, with unique ids', () => {
		const template = sanitizeTemplate({
			main: [
				{ id: 'p', type: 'player', props: { showTitle: false, evil: '<script>' } },
				{ id: 'p', type: 'text', props: { heading: 7, body: 'hello' } },
				{ type: 'script', props: {} },
			],
			side: [
				{ id: 'c', type: 'channels' },
				{ id: 'b', type: 'button', props: { label: 'Go', url: 'javascript:alert(1)' } },
			],
		});
		expect(template.main.map((b) => b.type)).toEqual(['player', 'text']);
		expect(template.main[0]!.props).toEqual({ showTitle: false, showDescription: true, showShare: true });
		expect(template.main[1]!.props).toEqual({ heading: '', body: 'hello' });
		expect(template.side[1]!.props).toEqual({ label: 'Go', url: '' });
		const ids = [...template.main, ...template.side].map((b) => b.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	test('a layout without a player or channel list falls back to the default', () => {
		const types = (t: ReturnType<typeof defaultTemplate>) => [t.main.map((b) => b.type), t.side.map((b) => b.type)];
		expect(types(sanitizeTemplate({ main: [{ type: 'player' }], side: [] }))).toEqual(types(defaultTemplate()));
		expect(types(sanitizeTemplate('nonsense'))).toEqual(types(defaultTemplate()));
	});

	test('uploaded pictures: allowed as image source only, and found for clean-up', () => {
		const template = sanitizeTemplate({
			main: [{ type: 'player' }, { type: 'image', props: { url: 'viewer-image/abcdefgh12.png', link: 'viewer-image/abcdefgh12.png' } }],
			side: [{ type: 'channels' }, { type: 'button', props: { label: 'x', url: 'viewer-image/abcdefgh12.png' } }],
		});
		expect(template.main[1]!.props).toMatchObject({ url: 'viewer-image/abcdefgh12.png', link: '' });
		expect(template.side[1]!.props.url).toBe('');

		const config = {
			...emptyConfig(),
			background: 'viewer-image/bbbbbbbb.jpg',
			template,
			presets: [
				{
					id: 'p',
					name: 'P',
					template: sanitizeTemplate({
						main: [{ type: 'player' }, { type: 'image', props: { url: 'viewer-image/cccccccc.webp' } }],
						side: [{ type: 'channels' }],
					}),
				},
			],
		};
		expect([...referencedImages(config)].sort()).toEqual(['viewer-image/abcdefgh12.png', 'viewer-image/bbbbbbbb.jpg', 'viewer-image/cccccccc.webp']);
	});

	test('presets need a name; stored config of any age normalises', () => {
		expect(sanitizePresets([{ name: '  ' }, { name: 'Mine', template: defaultTemplate() }]).map((p) => p.name)).toEqual(['Mine']);
		expect(normalizeConfig({ channels: [{ channelid: 'chan-a' }] })).toMatchObject({
			enabled: false,
			presets: [],
			channels: [{ access: 'hidden', uses: 0 }],
		});
	});
});
