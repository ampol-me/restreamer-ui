import { builtinPresets } from '../../../shared/viewer/template';
import { adminView, applyUpdate, ConfigError, referencedImages, type ConfigUpdate } from '../../utils/viewer/config';

// Admin: save the settings. A new passcode voids the grants of that channel's viewers.
export default defineEventHandler(async (event) => {
	await requireViewerAdmin(event);

	const body = (await readBody<ConfigUpdate>(event).catch(() => null)) ?? {};

	let saved;
	try {
		saved = await updateViewerConfig((current) => {
			const { config, changedCodes } = applyUpdate(current, body);
			return { config, result: { config, changedCodes } };
		});
	} catch (error) {
		if (error instanceof ConfigError) {
			throw createError({ statusCode: 400, statusMessage: error.message });
		}
		throw error;
	}

	await presenceReady();
	for (const channelid of saved.changedCodes) {
		viewerPresence.clear(channelid);
	}
	if (saved.changedCodes.length > 0) presenceChanged();

	await pruneImages(referencedImages(saved.config));

	const now = Date.now();
	return {
		...adminView(saved.config),
		builtinPresets: builtinPresets(),
		watching: Object.fromEntries(saved.config.channels.map((c) => [c.channelid, viewerPresence.count(c.channelid, now)])),
	};
});
