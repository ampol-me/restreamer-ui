// Requests that reach the core's stream files directly (not through /viewer-stream): the old
// player pages, embedded players, anyone with the address. The reverse proxy asks this server
// before passing each one on (nginx auth_request, see deploy/nginx-viewer-auth.conf).
import { createHmac, timingSafeEqual } from 'node:crypto';

import type { ChannelAccess } from './access';
import { isAllowedStreamPath } from './paths';

const STREAM_FILE = /\.(m3u8|ts|mp4|m4s|m4v|m4a|mpd|jpg)$/i;

/**
 * `uri` is the request path on the core's host, e.g. /memfs/<id>.m3u8 or /<id>/main/…/1.ts.
 * Stream files are served for public channels only; passcode channels are watched through the
 * viewer site, hidden and unlisted channels by the signed-in admin. Everything else the core
 * serves (player pages, scripts, the API) is not this server's business and passes.
 */
export function decideDirect(uri: string, channels: { channelid: string; access: ChannelAccess }[], isAdmin: boolean): boolean {
	let path: string;
	try {
		path = decodeURIComponent(uri.split('?')[0]!);
	} catch {
		return false;
	}

	if (!STREAM_FILE.test(path)) return true;
	if (isAdmin) return true;

	const file = path.replace(/^\/(memfs\/)?/, '');
	return channels.some((c) => c.access === 'public' && isAllowedStreamPath(c.channelid, file));
}

const sign = (expires: number, secret: string) => createHmac('sha256', secret).update(`admin:${expires}`).digest('base64url');

/** Cookie that marks a browser as the signed-in admin for direct stream requests. */
export function encodeAdminPass(expires: number, secret: string): string {
	return `${expires}.${sign(expires, secret)}`;
}

export function adminPassValid(token: unknown, secret: string, now: number): boolean {
	if (typeof token !== 'string') return false;
	const [expires, signature, ...rest] = token.split('.');
	if (!expires || !signature || rest.length !== 0 || !/^\d+$/.test(expires)) return false;

	const expected = Buffer.from(sign(Number(expires), secret));
	const actual = Buffer.from(signature);
	return expected.length === actual.length && timingSafeEqual(expected, actual) && Number(expires) > now;
}
