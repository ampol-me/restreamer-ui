import { isAllowedStreamPath, upstreamStreamPath } from '../../../utils/viewer/paths';

// Response headers of the core that are passed on to the viewer.
const PASS_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'last-modified', 'etag'];

// Viewer: HLS playlists, segments and the poster of a channel, fetched from the core.
// Playlists use relative URLs, so they work unchanged below this route.
export default defineEventHandler(async (event) => {
	const config = await getViewerConfig();
	await presenceReady();

	const channelid = getRouterParam(event, 'channel') ?? '';
	const path = getRouterParam(event, 'path') ?? '';

	const channel = config.channels.find((c) => c.channelid === channelid);
	const decision = decideStream(channel, config.enabled, await readGrants(event, config));
	if (!decision.allow) {
		throw createError({
			statusCode: decision.status,
			statusMessage: decision.status === 429 ? 'The maximum number of viewers is watching right now.' : 'Not available.',
		});
	}
	if (!channel || !isAllowedStreamPath(channelid, path)) {
		throw createError({ statusCode: 404, statusMessage: 'Not found.' });
	}

	const target = viewerCoreAddress(event) + upstreamStreamPath(channel.storage, path, getQuery(event).session);

	// A fresh request rather than a forwarded one: nothing of the viewer's request (cookies,
	// client address, …) reaches the core except an optional byte range.
	const range = getHeader(event, 'range');

	let upstream: Response;
	try {
		upstream = await fetch(target, {
			headers: range ? { Range: range } : {},
			redirect: 'manual',
			signal: AbortSignal.timeout(30_000),
		});
	} catch {
		throw createError({ statusCode: 502, statusMessage: 'The core could not be reached.' });
	}

	if (upstream.status !== 200 && upstream.status !== 206) {
		await upstream.body?.cancel();
		throw createError({
			statusCode: upstream.status === 404 ? 404 : 502,
			statusMessage: upstream.status === 404 ? 'Not found.' : 'Unexpected answer from the core.',
		});
	}

	setResponseStatus(event, upstream.status);
	for (const name of PASS_HEADERS) {
		const value = upstream.headers.get(name);
		if (value !== null) {
			setResponseHeader(event, name, value);
		}
	}

	// Playlists and the poster change constantly; segments never do.
	setResponseHeader(event, 'Cache-Control', /\.(m3u8|mpd|jpg)$/i.test(path) ? 'no-store' : 'private, max-age=60');

	return upstream.body;
});
