import { createHmac, timingSafeEqual } from 'node:crypto';

export interface PortalSession {
	// Expiry, milliseconds since epoch.
	exp: number;
	// Config revision the session was issued for; changing the passcode bumps it and ends all sessions.
	rev: number;
}

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest('base64url');

/** Stateless session token: base64url(JSON) + "." + HMAC-SHA256. */
export function createSessionToken(session: PortalSession, secret: string): string {
	const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
	return `${payload}.${sign(payload, secret)}`;
}

export function readSessionToken(token: unknown, secret: string, now: number, rev: number): PortalSession | null {
	if (typeof token !== 'string') {
		return null;
	}

	const [payload, signature, ...rest] = token.split('.');
	if (!payload || !signature || rest.length !== 0) {
		return null;
	}

	const expected = Buffer.from(sign(payload, secret));
	const actual = Buffer.from(signature);
	if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
		return null;
	}

	let session: PortalSession;
	try {
		session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
	} catch {
		return null;
	}

	if (typeof session?.exp !== 'number' || typeof session?.rev !== 'number') {
		return null;
	}

	if (session.exp <= now || session.rev !== rev) {
		return null;
	}

	return session;
}
