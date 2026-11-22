// Who may watch what. A viewer's cookie carries one signed "grant" per channel they unlocked;
// the rules for handing out and honouring grants are here, free of any HTTP.
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import type { PasscodeHash } from './passcode';
import { verifyPasscode } from './passcode';

export type ChannelAccess = 'public' | 'passcode' | 'hidden';

export interface ChannelLimits {
	// Viewers watching at the same time with this channel's passcode; 0 = no limit.
	maxViewers: number;
	// The passcode stops working at this moment (ISO 8601); null = never.
	expiresAt: string | null;
	// How many times the passcode may be used to unlock the channel; 0 = no limit.
	maxUses: number;
}

export interface ChannelRule {
	channelid: string;
	access: ChannelAccess;
	passcode: PasscodeHash | null;
	// Bumped when the passcode changes: grants for an older revision are void.
	codeRevision: number;
	limits: ChannelLimits;
	// Successful unlocks since the passcode (or the counter) was last set.
	uses: number;
}

export interface Grant {
	// channel id
	c: string;
	// code revision it was issued for
	r: number;
	// expiry, ms since epoch
	e: number;
	// session id, one per unlock: what the concurrent-viewer limit counts
	s: string;
}

export const noLimits = (): ChannelLimits => ({ maxViewers: 0, expiresAt: null, maxUses: 0 });

export function sanitizeLimits(value: unknown): ChannelLimits {
	const input = (value ?? {}) as Partial<Record<keyof ChannelLimits, unknown>>;
	const count = (v: unknown) => {
		const n = Math.floor(Number(v));
		return Number.isFinite(n) && n > 0 ? Math.min(n, 1_000_000) : 0;
	};

	let expiresAt: string | null = null;
	if (typeof input.expiresAt === 'string' && input.expiresAt !== '') {
		const time = Date.parse(input.expiresAt);
		if (Number.isFinite(time)) expiresAt = new Date(time).toISOString();
	}

	return { maxViewers: count(input.maxViewers), expiresAt, maxUses: count(input.maxUses) };
}

export const isExpired = (rule: Pick<ChannelRule, 'limits'>, now: number) => rule.limits.expiresAt !== null && Date.parse(rule.limits.expiresAt) <= now;

export type UnlockRefusal = 'not-found' | 'expired' | 'wrong' | 'exhausted' | 'full';

/**
 * Checks a passcode against a channel's rule. The order matters: a correct code for an expired
 * or used-up passcode is reported as such, a wrong one never learns anything but "wrong".
 */
export function checkUnlock(
	rule: ChannelRule | undefined,
	passcode: unknown,
	now: number,
	activeViewers: number,
): { ok: true } | { ok: false; reason: UnlockRefusal } {
	if (!rule || rule.access !== 'passcode' || !rule.passcode) {
		return { ok: false, reason: 'not-found' };
	}
	if (!verifyPasscode(passcode, rule.passcode)) {
		return { ok: false, reason: 'wrong' };
	}
	if (isExpired(rule, now)) {
		return { ok: false, reason: 'expired' };
	}
	if (rule.limits.maxUses > 0 && rule.uses >= rule.limits.maxUses) {
		return { ok: false, reason: 'exhausted' };
	}
	if (rule.limits.maxViewers > 0 && activeViewers >= rule.limits.maxViewers) {
		return { ok: false, reason: 'full' };
	}

	return { ok: true };
}

export const newSessionId = () => randomBytes(9).toString('base64url');

/** Whether a grant still opens its channel. */
export function grantValid(grant: Grant, rule: ChannelRule | undefined, now: number): boolean {
	return (
		rule !== undefined &&
		rule.access === 'passcode' &&
		grant.c === rule.channelid &&
		grant.r === rule.codeRevision &&
		grant.e > now &&
		!isExpired(rule, now)
	);
}

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

/** Cookie value: base64url(JSON grants) + "." + HMAC-SHA256. */
export function encodeGrants(grants: Grant[], secret: string): string {
	const payload = Buffer.from(JSON.stringify(grants)).toString('base64url');
	return `${payload}.${sign(payload, secret)}`;
}

export function decodeGrants(token: unknown, secret: string): Grant[] {
	if (typeof token !== 'string') return [];

	const [payload, signature, ...rest] = token.split('.');
	if (!payload || !signature || rest.length !== 0) return [];

	const expected = Buffer.from(sign(payload, secret));
	const actual = Buffer.from(signature);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return [];

	try {
		const grants = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (!Array.isArray(grants)) return [];
		return grants.filter((g) => typeof g?.c === 'string' && typeof g?.r === 'number' && typeof g?.e === 'number' && typeof g?.s === 'string');
	} catch {
		return [];
	}
}

/** The grants worth keeping when a new one is added: one per channel, the still valid ones. */
export function mergeGrants(existing: Grant[], added: Grant, rules: ChannelRule[], now: number): Grant[] {
	const byChannel = new Map(rules.map((r) => [r.channelid, r]));
	return [...existing.filter((g) => g.c !== added.c && grantValid(g, byChannel.get(g.c), now)), added];
}
