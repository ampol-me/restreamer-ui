import { encodeAdminPass } from '../../utils/viewer/direct';

// Admin: mark this browser as signed in, so its previews (which fetch stream files straight
// from the core, without the access token) pass the reverse proxy's check.
export default defineEventHandler(async (event) => {
	await requireViewerAdmin(event);

	setCookie(event, VIEWER_ADMIN_COOKIE, encodeAdminPass(Date.now() + GRANT_MS, await getViewerSecret()), {
		httpOnly: true,
		sameSite: 'lax',
		secure: getRequestProtocol(event, { xForwardedProto: true }) === 'https',
		// The whole host: the stream files live outside the app's path.
		path: '/',
		maxAge: GRANT_MS / 1000,
	});

	return { ok: true };
});
