// Viewer: the channels offered by the portal, with the URLs to play them through this server.
export default defineEventHandler(async (event) => {
	const config = await requirePortalViewer(event);

	return {
		title: config.title,
		channels: config.channels.map((channel) => ({
			channelid: channel.channelid,
			name: channel.name,
			manifest: `/portal-stream/${channel.channelid}/${channel.channelid}.m3u8`,
			poster: `/portal-stream/${channel.channelid}/${channel.channelid}.jpg`,
		})),
	};
});
