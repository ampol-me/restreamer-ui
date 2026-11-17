import { joinURL } from 'ufo';

import { isExpired } from '../../utils/viewer/access';

// Viewer: what the page shows. Hidden channels are left out; a passcode channel is listed by
// name, and gets its stream address only once this viewer has unlocked it.
export default defineEventHandler(async (event) => {
	const config = await getViewerConfig();
	if (!config.enabled) {
		return { enabled: false, title: config.title, background: '', template: null, channels: [] };
	}

	const now = Date.now();
	const unlocked = new Set((await readGrants(event, config, now)).map((g) => g.c));
	const base = useRuntimeConfig(event).app.baseURL;

	return {
		enabled: true,
		title: config.title,
		background: config.background,
		template: config.template,
		channels: config.channels
			.filter((c) => c.access !== 'hidden')
			.map((c) => {
				const open = c.access === 'public' || unlocked.has(c.channelid);
				return {
					channelid: c.channelid,
					name: c.name,
					description: c.description,
					access: c.access,
					unlocked: open,
					expired: c.access === 'passcode' && isExpired(c, now),
					manifest: open ? joinURL(base, 'viewer-stream', c.channelid, `${c.channelid}.m3u8`) : '',
					poster: open ? joinURL(base, 'viewer-stream', c.channelid, `${c.channelid}.jpg`) : '',
				};
			}),
	};
});
