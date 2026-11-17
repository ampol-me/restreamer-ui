import { checkUnlock, mergeGrants, newSessionId, type Grant, type UnlockRefusal } from '../../utils/viewer/access';

const refusals: Record<UnlockRefusal, { status: number; message: string }> = {
	'not-found': { status: 404, message: 'This channel is not available.' },
	wrong: { status: 401, message: 'Wrong passcode.' },
	expired: { status: 410, message: 'This passcode has expired.' },
	exhausted: { status: 410, message: 'This passcode has been used the maximum number of times.' },
	full: { status: 409, message: 'The maximum number of viewers is watching right now.' },
};

// Viewer: unlock one channel with its passcode.
export default defineEventHandler(async (event) => {
	const client = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
	const now = Date.now();

	const wait = viewerLimiter.retryAfter(client, now);
	if (wait > 0) {
		const seconds = Math.ceil(wait / 1000);
		setResponseHeader(event, 'Retry-After', seconds);
		throw createError({ statusCode: 429, statusMessage: 'Too many attempts.', data: { retryAfter: seconds } });
	}

	const body = await readBody<{ channelid?: unknown; passcode?: unknown }>(event).catch(() => null);

	// Checked and counted in one step, so the use limit holds when several viewers unlock at once.
	const outcome = await updateViewerConfig((config) => {
		const rule = config.enabled ? config.channels.find((c) => c.channelid === body?.channelid) : undefined;
		const check = checkUnlock(rule, body?.passcode, now, rule ? viewerPresence.count(rule.channelid, now) : 0);
		if (!check.ok || !rule) {
			return { config, result: { check, grant: null as Grant | null, config } };
		}

		const expires = rule.limits.expiresAt ? Date.parse(rule.limits.expiresAt) : Infinity;
		const grant: Grant = { c: rule.channelid, r: rule.codeRevision, e: Math.min(now + GRANT_MS, expires), s: newSessionId() };
		const next = { ...config, channels: config.channels.map((c) => (c === rule ? { ...c, uses: c.uses + 1 } : c)) };
		return { config: next, result: { check, grant, config: next } };
	});

	if (!outcome.check.ok || !outcome.grant) {
		const reason = outcome.check.ok ? 'not-found' : outcome.check.reason;
		// Only a wrong guess counts against the client; the other answers need the right passcode
		// (or name a channel that takes none).
		if (reason === 'wrong') viewerLimiter.recordFailure(client, now);
		throw createError({ statusCode: refusals[reason].status, statusMessage: refusals[reason].message, data: { reason } });
	}

	viewerLimiter.recordSuccess(client);

	const rule = outcome.config.channels.find((c) => c.channelid === outcome.grant!.c)!;
	// The seat is taken now, not at the first stream request, so two unlocks cannot share the last one.
	viewerPresence.touch(rule.channelid, outcome.grant.s, now, rule.limits.maxViewers);

	const existing = await readGrants(event, outcome.config, now);
	for (const old of existing.filter((g) => g.c === rule.channelid)) {
		viewerPresence.leave(old.c, old.s);
	}
	await setGrantCookie(event, mergeGrants(existing, outcome.grant, outcome.config.channels, now));

	return { ok: true };
});
