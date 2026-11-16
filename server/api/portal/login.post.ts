import { verifyPasscode } from '../../utils/portal/passcode';
import { createSessionToken } from '../../utils/portal/session';

export default defineEventHandler(async (event) => {
	const config = await getPortalConfig();
	if (!config.enabled || !config.passcode) {
		throw createError({ statusCode: 404, statusMessage: 'The portal is not enabled.' });
	}

	const client = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown';
	const now = Date.now();

	const wait = portalLimiter.retryAfter(client, now);
	if (wait > 0) {
		const seconds = Math.ceil(wait / 1000);
		setResponseHeader(event, 'Retry-After', seconds);
		throw createError({ statusCode: 429, statusMessage: 'Too many attempts.', data: { retryAfter: seconds } });
	}

	const body = await readBody<{ passcode?: unknown }>(event).catch(() => null);

	if (!verifyPasscode(body?.passcode, config.passcode)) {
		portalLimiter.recordFailure(client, now);
		throw createError({ statusCode: 401, statusMessage: 'Wrong passcode.' });
	}

	portalLimiter.recordSuccess(client);

	const token = createSessionToken({ exp: now + PORTAL_SESSION_MS, rev: config.revision }, await getPortalSecret());
	setCookie(event, PORTAL_COOKIE, token, {
		httpOnly: true,
		sameSite: 'lax',
		secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
		// Scoped to the app: on a shared host the cookie must not travel to the core's own paths.
		path: useRuntimeConfig(event).app.baseURL,
		maxAge: PORTAL_SESSION_MS / 1000,
	});

	return { ok: true };
});
