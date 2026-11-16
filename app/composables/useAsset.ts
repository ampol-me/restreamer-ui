import { joinURL } from 'ufo';

/**
 * URL of a file from public/ (or a server route) below the app's base URL. The app may be
 * served from a sub-path (e.g. /app/), so root-relative URLs must not be hard-coded.
 */
export function useAsset() {
	const base = useRuntimeConfig().app.baseURL;
	return (path: string) => joinURL(base, path);
}
