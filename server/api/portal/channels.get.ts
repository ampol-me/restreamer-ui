import { joinURL } from 'ufo';

// Viewer: the channels offered by the portal, with the URLs to play them through this server.
export default defineEventHandler(async (event) => {
	const config = await requirePortalViewer(event);
	// The app may be mounted below a sub-path.
	const base = useRuntimeConfig(event).app.baseURL;

	return {
		title: config.title,
		channels: config.channels.map((channel) => ({
			channelid: channel.channelid,
			name: channel.name,
			manifest: joinURL(base, `portal-stream/${channel.channelid}/${channel.channelid}.m3u8`),
			poster: joinURL(base, `portal-stream/${channel.channelid}/${channel.channelid}.jpg`),
		})),
	};
});
