import { UPLOADED_IMAGE } from '../../../shared/viewer/template';

const TYPES: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif' };

// Viewer: a picture uploaded for the page. Names are random and never reused, so it may be cached.
export default defineEventHandler(async (event) => {
	const name = getRouterParam(event, 'name') ?? '';
	const match = UPLOADED_IMAGE.exec(`viewer-image/${name}`);
	const data = match ? await useStorage('data').getItemRaw<Uint8Array>(imageKey(name)) : null;
	if (!match || !data) {
		throw createError({ statusCode: 404, statusMessage: 'Not found.' });
	}

	setResponseHeader(event, 'Content-Type', TYPES[match[2]!]!);
	setResponseHeader(event, 'X-Content-Type-Options', 'nosniff');
	setResponseHeader(event, 'Cache-Control', 'public, max-age=31536000, immutable');
	return data;
});
