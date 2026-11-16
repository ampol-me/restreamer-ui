// Admin: current portal settings (never the passcode or its hash).
export default defineEventHandler(async (event) => {
	await requirePortalAdmin(event);

	const config = await getPortalConfig();

	return { enabled: config.enabled, title: config.title, channels: config.channels, hasPasscode: config.passcode !== null };
});
