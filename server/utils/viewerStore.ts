import { randomBytes } from 'node:crypto';
import type { H3Event } from 'h3';

import { decodeGrants, encodeGrants, grantValid, type Grant } from './viewer/access';
import { emptyConfig, migratePortal, normalizeConfig, type LegacyPortalConfig, type ViewerChannel, type ViewerConfig } from './viewer/config';
import { AttemptLimiter } from './viewer/limiter';
import { Presence } from './viewer/presence';

export const VIEWER_COOKIE = 'viewer_session';
export const VIEWER_ADMIN_COOKIE = 'viewer_admin';
// A grant lasts this long after unlocking (or until the passcode expires or changes).
export const GRANT_MS = 12 * 60 * 60 * 1000;

const CONFIG_KEY = 'viewer:config';
const SECRET_KEY = 'viewer:secret';
// The single-passcode View Portal this replaced.
const LEGACY_CONFIG_KEY = 'portal:config';

// The reverse proxy asks about every stream file: the settings and the key are kept in memory
// between saves instead of being read from disk each time.
let cachedConfig: ViewerConfig | null = null;
let cachedSecret: string | null = null;

export async function getViewerConfig(): Promise<ViewerConfig> {
	if (cachedConfig) return cachedConfig;

	const storage = useStorage('data');

	const stored = await storage.getItem(CONFIG_KEY);
	if (stored) {
		return (cachedConfig = normalizeConfig(stored));
	}

	const legacy = await storage.getItem<LegacyPortalConfig>(LEGACY_CONFIG_KEY);
	if (legacy) {
		const migrated = migratePortal(legacy);
		await storage.setItem(CONFIG_KEY, migrated);
		return (cachedConfig = migrated);
	}

	return emptyConfig();
}

export async function saveViewerConfig(config: ViewerConfig): Promise<void> {
	await useStorage('data').setItem(CONFIG_KEY, config);
	cachedConfig = config;
}

/** Key the viewer cookies are signed with; created on first use and kept with the config. */
export async function getViewerSecret(): Promise<string> {
	if (cachedSecret) return cachedSecret;

	const storage = useStorage('data');
	let secret = await storage.getItem<string>(SECRET_KEY);
	if (typeof secret !== 'string' || secret.length < 32) {
		secret = randomBytes(32).toString('hex');
		await storage.setItem(SECRET_KEY, secret);
	}
	return (cachedSecret = secret);
}

// One of each per server process.
export const viewerLimiter = new AttemptLimiter();
export const viewerPresence = new Presence();

/** The core this server fronts. Fixed by configuration, never taken from a request. */
export function viewerCoreAddress(event: H3Event): string {
	const config = useRuntimeConfig(event);
	const address = String(config.coreAddress || config.public.coreAddress || '').replace(/\/+$/, '');
	if (!address) {
		throw createError({ statusCode: 503, statusMessage: 'The viewer site is not configured: set NUXT_CORE_ADDRESS to the address of the core.' });
	}
	return address;
}

/** The valid grants of this request's cookie. */
export async function readGrants(event: H3Event, config: ViewerConfig, now = Date.now()): Promise<Grant[]> {
	const grants = decodeGrants(getCookie(event, VIEWER_COOKIE), await getViewerSecret());
	const rules = new Map(config.channels.map((c) => [c.channelid, c]));
	return grants.filter((g) => grantValid(g, rules.get(g.c), now));
}

export type StreamDecision = { allow: true } | { allow: false; status: 401 | 403 | 404 | 429 };

/**
 * May this request fetch stream files of `channel`? Public channels: yes. Passcode channels:
 * with a valid grant, and while a seat is free (the request itself keeps the seat warm).
 */
export function decideStream(channel: ViewerChannel | undefined, enabled: boolean, grants: Grant[], now = Date.now()): StreamDecision {
	if (!enabled || !channel || channel.access === 'hidden') {
		return { allow: false, status: 404 };
	}
	if (channel.access === 'public') {
		return { allow: true };
	}

	const grant = grants.find((g) => g.c === channel.channelid);
	if (!grant) {
		return { allow: false, status: 401 };
	}
	if (!viewerPresence.touch(channel.channelid, grant.s, now, channel.limits.maxViewers)) {
		return { allow: false, status: 429 };
	}

	return { allow: true };
}

async function coreAccepts(event: H3Event, authorization: string | undefined): Promise<number> {
	const core = viewerCoreAddress(event);
	try {
		const response = await fetch(`${core}/api/v3/config`, {
			headers: authorization ? { Authorization: authorization } : {},
			signal: AbortSignal.timeout(10_000),
		});
		return response.status;
	} catch {
		return 0;
	}
}

/**
 * Admin requests carry the caller's core access token. It is valid if the core accepts it
 * for an authenticated endpoint, so this server needs no credentials of its own.
 */
export async function requireViewerAdmin(event: H3Event): Promise<void> {
	const status = await coreAccepts(event, getHeader(event, 'authorization'));
	if (status === 0) {
		throw createError({ statusCode: 502, statusMessage: 'The core could not be reached.' });
	}
	if (status !== 200) {
		throw createError({ statusCode: status === 401 || status === 403 ? 401 : 502, statusMessage: 'Not authorized by the core.' });
	}
}

// Config changes are read-modify-write on a file: one at a time.
let queue: Promise<unknown> = Promise.resolve();

export function updateViewerConfig<T>(
	change: (config: ViewerConfig) => Promise<{ config: ViewerConfig; result: T }> | { config: ViewerConfig; result: T },
): Promise<T> {
	const run = queue.then(async () => {
		const { config, result } = await change(await getViewerConfig());
		await saveViewerConfig(config);
		return result;
	});
	queue = run.catch(() => {});
	return run;
}

export async function setGrantCookie(event: H3Event, grants: Grant[]): Promise<void> {
	const options = {
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
		// Scoped to the app: on a shared host the cookie must not travel to the core's own paths.
		path: useRuntimeConfig(event).app.baseURL,
	};
	if (grants.length === 0) {
		deleteCookie(event, VIEWER_COOKIE, options);
		return;
	}
	setCookie(event, VIEWER_COOKIE, encodeGrants(grants, await getViewerSecret()), { ...options, maxAge: GRANT_MS / 1000 });
}
