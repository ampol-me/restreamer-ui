import { builtinPresets } from '../../../shared/viewer/template';
import { adminView } from '../../utils/viewer/config';

// Admin: the settings (never the passcode hashes), the built-in layouts and who is watching.
export default defineEventHandler(async (event) => {
	await requireViewerAdmin(event);

	const config = await getViewerConfig();
	const now = Date.now();

	return {
		...adminView(config),
		builtinPresets: builtinPresets(),
		watching: Object.fromEntries(config.channels.map((c) => [c.channelid, viewerPresence.count(c.channelid, now)])),
	};
});
