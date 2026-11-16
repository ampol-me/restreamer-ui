export default defineEventHandler((event) => {
	deleteCookie(event, PORTAL_COOKIE, { path: '/' });
	return { ok: true };
});
