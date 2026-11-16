export default defineEventHandler((event) => {
	deleteCookie(event, PORTAL_COOKIE, { path: useRuntimeConfig(event).app.baseURL });
	return { ok: true };
});
