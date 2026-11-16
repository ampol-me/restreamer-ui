import { hashPasscode, isValidPasscode } from '../../utils/portal/passcode';

// Admin: update the portal settings. `passcode` is optional; omit it to keep the current one.
export default defineEventHandler(async (event) => {
	await requirePortalAdmin(event);

	const body = await readBody<{ enabled?: unknown; title?: unknown; channels?: unknown; passcode?: unknown }>(event).catch(() => null);
	if (!body || typeof body !== 'object') {
		throw createError({ statusCode: 400, statusMessage: 'Invalid request body.' });
	}

	const config = await getPortalConfig();

	if (body.passcode !== undefined && body.passcode !== null && body.passcode !== '') {
		if (!isValidPasscode(body.passcode)) {
			throw createError({ statusCode: 400, statusMessage: 'The passcode must be exactly 6 digits.' });
		}
		config.passcode = hashPasscode(body.passcode);
		config.revision += 1;
	}

	config.enabled = body.enabled === true;
	config.title = String(body.title ?? '').slice(0, 200);
	config.channels = sanitizeChannels(body.channels);

	if (config.enabled && !config.passcode) {
		throw createError({ statusCode: 400, statusMessage: 'Set a passcode before enabling the portal.' });
	}

	await savePortalConfig(config);

	return { enabled: config.enabled, title: config.title, channels: config.channels, hasPasscode: config.passcode !== null };
});
