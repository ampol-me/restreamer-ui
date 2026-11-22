import { execFile } from 'node:child_process';
import type { H3Event } from 'h3';

import { FeedError, FeedSessions, type FeedFailure } from './studio/sessions';

let sessions: FeedSessions | null = null;

/** The Studio feeds of this server process. */
export function studioFeeds(event: H3Event): FeedSessions {
	sessions ??= new FeedSessions({ ffmpegPath: studioFfmpegPath(event) });
	return sessions;
}

export const studioFfmpegPath = (event: H3Event) => String(useRuntimeConfig(event).ffmpegPath || 'ffmpeg');

let ffmpegVersion: Promise<string> | null = null;

/** The version of the server's ffmpeg, '' if there is none. Asked once: it does not change while the server runs. */
export function studioFfmpegVersion(event: H3Event): Promise<string> {
	ffmpegVersion ??= new Promise((resolve) => {
		execFile(studioFfmpegPath(event), ['-version'], { timeout: 5000 }, (error, stdout) => {
			resolve(error ? '' : (/^ffmpeg version (\S+)/.exec(stdout)?.[1] ?? 'unknown'));
		});
	});
	return ffmpegVersion;
}

/**
 * The core's stored config, fetched with the caller's access token: the caller is an admin if the
 * core hands it out, and the config says where the core's RTMP server is.
 */
export async function requireCoreConfig(event: H3Event): Promise<{ core: string; config: unknown }> {
	const core = viewerCoreAddress(event);
	const authorization = getHeader(event, 'authorization');

	let response: Response;
	try {
		response = await fetch(`${core}/api/v3/config`, {
			headers: authorization ? { Authorization: authorization } : {},
			signal: AbortSignal.timeout(10_000),
		});
	} catch {
		throw createError({ statusCode: 502, statusMessage: 'The core could not be reached.' });
	}
	if (response.status !== 200) {
		const denied = response.status === 401 || response.status === 403;
		throw createError({ statusCode: denied ? 401 : 502, statusMessage: denied ? 'Not authorized by the core.' : 'The core could not be reached.' });
	}

	const body = (await response.json()) as { config?: unknown };
	return { core, config: body.config ?? null };
}

const STATUS: Record<FeedFailure, number> = { busy: 409, 'no-ffmpeg': 503, unknown: 404, ended: 410, gap: 409, overrun: 410 };

/** A feed failure as the HTTP error the Studio shows. */
export function feedHttpError(error: unknown) {
	if (error instanceof FeedError) {
		return createError({ statusCode: STATUS[error.reason], statusMessage: error.message, data: { reason: error.reason } });
	}
	return createError({ statusCode: 500, statusMessage: 'The feed failed.' });
}
