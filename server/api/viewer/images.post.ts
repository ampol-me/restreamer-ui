import { randomBytes } from 'node:crypto';

const MAX_BYTES = 5 * 1024 * 1024;

// The type is taken from the file's first bytes, not from what the browser says it is.
function imageType(bytes: Uint8Array): 'png' | 'jpg' | 'webp' | 'gif' | null {
	const starts = (...signature: number[]) => signature.every((b, i) => bytes[i] === b);
	if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return 'png';
	if (starts(0xff, 0xd8, 0xff)) return 'jpg';
	if (starts(0x47, 0x49, 0x46, 0x38)) return 'gif';
	if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp';
	return null;
}

// Admin: upload a picture for the viewer page (background or image block). The body is the file.
// It is kept until a save of the settings no longer refers to it.
export default defineEventHandler(async (event) => {
	await requireViewerAdmin(event);

	if (Number(getHeader(event, 'content-length') ?? 0) > MAX_BYTES) {
		throw createError({ statusCode: 413, statusMessage: 'The picture is larger than 5 MB.' });
	}

	const body = await readRawBody(event, false);
	if (!body || body.length === 0) {
		throw createError({ statusCode: 400, statusMessage: 'No picture was sent.' });
	}
	if (body.length > MAX_BYTES) {
		throw createError({ statusCode: 413, statusMessage: 'The picture is larger than 5 MB.' });
	}

	const type = imageType(body);
	if (!type) {
		throw createError({ statusCode: 415, statusMessage: 'Only PNG, JPEG, WebP and GIF pictures can be used.' });
	}

	const name = `${randomBytes(8).toString('hex')}.${type}`;
	await useStorage('data').setItemRaw(imageKey(name), body);

	return { url: `viewer-image/${name}` };
});
