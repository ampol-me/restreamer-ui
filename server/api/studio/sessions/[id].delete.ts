// Take a Studio feed off air.
export default defineEventHandler((event) => {
	const id = getRouterParam(event, 'id') ?? '';
	if (!/^[0-9a-f]{64}$/.test(id)) {
		throw createError({ statusCode: 400, statusMessage: 'The feed is not addressed correctly.' });
	}

	return { ended: studioFeeds(event).end(id) };
});
