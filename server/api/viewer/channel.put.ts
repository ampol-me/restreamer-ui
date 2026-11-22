import { builtinPresets } from '../../../shared/viewer/template';
import { adminView, applyChannelUpdate, ConfigError, referencedImages, type ChannelUpdate } from '../../utils/viewer/config';

// Admin: change who may watch one channel, from that channel's own page.
export default defineEventHandler(async (event) => {
	await requireViewerAdmin(event);

	const body = (await readBody<ChannelUpdate & { enable?: unknown; presets?: unknown }>(event).catch(() => null)) ?? {};
	const { enable, presets, ...entry } = body;

	let saved;
	try {
		saved = await updateViewerConfig((current) => {
			const { config, changedCodes } = applyChannelUpdate(current, entry, enable === true, presets);
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

	return { ...adminView(saved.config), builtinPresets: builtinPresets() };
});
