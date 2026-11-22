// One piece of a Studio recording (the request body), numbered by ?seq=. The id of the feed is
// the key: only the browser that started it knows it.
const MAX_BYTES = 16 * 1024 * 1024;

export default defineEventHandler(async (event) => {
	const id = getRouterParam(event, 'id') ?? '';
	const seq = Number(getQuery(event).seq);
	if (!/^[0-9a-f]{64}$/.test(id) || !Number.isInteger(seq) || seq < 0) {
		throw createError({ statusCode: 400, statusMessage: 'The piece is not addressed correctly.' });
	}
	if (Number(getHeader(event, 'content-length') ?? 0) > MAX_BYTES) {
		throw createError({ statusCode: 413, statusMessage: 'The piece is too large.' });
	}

	const body = await readRawBody(event, false);
	if (!body || body.length === 0 || body.length > MAX_BYTES) {
		throw createError({ statusCode: 400, statusMessage: 'The piece is empty or too large.' });
	}

	try {
		return { progress: studioFeeds(event).push(id, seq, body) };
	} catch (e: unknown) {
		throw feedHttpError(e);
	}
});
