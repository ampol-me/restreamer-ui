// Admin signed out: previews are no longer this browser's to fetch.
export default defineEventHandler((event) => {
	deleteCookie(event, VIEWER_ADMIN_COOKIE, { path: '/' });
	return { ok: true };
});
