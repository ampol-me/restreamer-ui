// Viewer: lock everything again and give the seats back.
export default defineEventHandler(async (event) => {
	for (const grant of await readGrants(event, await getViewerConfig())) {
		viewerPresence.leave(grant.c, grant.s);
	}
	await setGrantCookie(event, []);
	return { ok: true };
});
