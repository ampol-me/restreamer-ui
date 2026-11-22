// Admin: can this server take a Studio feed, and which channels are live from one?
export default defineEventHandler(async (event) => {
	await requireViewerAdmin(event);

	return { ffmpeg: await studioFfmpegVersion(event), live: studioFeeds(event).live() };
});
