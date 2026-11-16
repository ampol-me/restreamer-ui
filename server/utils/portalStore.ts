import { randomBytes } from 'node:crypto';
import type { H3Event } from 'h3';

import { AttemptLimiter } from './portal/limiter';
import type { PasscodeHash } from './portal/passcode';
import { isChannelId, type StreamStorage } from './portal/paths';
import { readSessionToken } from './portal/session';

export interface PortalChannel {
	channelid: string;
	name: string;
	storage: StreamStorage;
}

export interface PortalConfig {
	enabled: boolean;
	title: string;
	channels: PortalChannel[];
	passcode: PasscodeHash | null;
	// Bumped whenever the passcode changes; sessions issued for an older revision are void.
	revision: number;
}

export const PORTAL_COOKIE = 'portal_session';
export const PORTAL_SESSION_MS = 12 * 60 * 60 * 1000;

const CONFIG_KEY = 'portal:config';
const SECRET_KEY = 'portal:secret';

const emptyConfig = (): PortalConfig => ({ enabled: false, title: '', channels: [], passcode: null, revision: 0 });

export async function getPortalConfig(): Promise<PortalConfig> {
	const stored = await useStorage('data').getItem<Partial<PortalConfig>>(CONFIG_KEY);
	return { ...emptyConfig(), ...(stored ?? {}) };
}

export async function savePortalConfig(config: PortalConfig): Promise<void> {
	await useStorage('data').setItem(CONFIG_KEY, config);
}

/** Key the session cookies are signed with; created on first use and kept with the config. */
export async function getPortalSecret(): Promise<string> {
	const storage = useStorage('data');
	let secret = await storage.getItem<string>(SECRET_KEY);
	if (typeof secret !== 'string' || secret.length < 32) {
		secret = randomBytes(32).toString('hex');
		await storage.setItem(SECRET_KEY, secret);
	}
	return secret;
}

// One limiter per server process.
export const portalLimiter = new AttemptLimiter();

/** The core this server fronts. Fixed by configuration, never taken from a request. */
export function portalCoreAddress(event: H3Event): string {
	const config = useRuntimeConfig(event);
	const address = String(config.coreAddress || config.public.coreAddress || '').replace(/\/+$/, '');
	if (!address) {
		throw createError({ statusCode: 503, statusMessage: 'The portal is not configured: set NUXT_CORE_ADDRESS to the address of the core.' });
	}
	return address;
}

export function sanitizeChannels(value: unknown): PortalChannel[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const seen = new Set<string>();
	const channels: PortalChannel[] = [];
	for (const entry of value) {
		const channelid = entry?.channelid;
		if (!isChannelId(channelid) || seen.has(channelid)) {
			continue;
		}
		seen.add(channelid);
		channels.push({
			channelid,
			name: String(entry?.name ?? '').slice(0, 200),
			storage: entry?.storage === 'diskfs' ? 'diskfs' : 'memfs',
		});
	}

	return channels;
}

/** Throws 401 unless the request carries a valid viewer session. Returns the portal config. */
export async function requirePortalViewer(event: H3Event): Promise<PortalConfig> {
	const config = await getPortalConfig();
	if (!config.enabled || !config.passcode) {
		throw createError({ statusCode: 404, statusMessage: 'The portal is not enabled.' });
	}

	const session = readSessionToken(getCookie(event, PORTAL_COOKIE), await getPortalSecret(), Date.now(), config.revision);
	if (!session) {
		throw createError({ statusCode: 401, statusMessage: 'Passcode required.' });
	}

	return config;
}

/**
 * Admin requests carry the caller's core access token. It is valid if the core accepts it
 * for an authenticated endpoint, so the portal needs no credentials of its own.
 */
export async function requirePortalAdmin(event: H3Event): Promise<void> {
	const core = portalCoreAddress(event);
	const authorization = getHeader(event, 'authorization');

	let status: number;
	try {
		const response = await fetch(`${core}/api/v3/config`, {
			headers: authorization ? { Authorization: authorization } : {},
			signal: AbortSignal.timeout(10_000),
		});
		status = response.status;
	} catch {
		throw createError({ statusCode: 502, statusMessage: 'The core could not be reached.' });
	}

	if (status !== 200) {
		throw createError({ statusCode: status === 401 || status === 403 ? 401 : 502, statusMessage: 'Not authorized by the core.' });
	}
}
