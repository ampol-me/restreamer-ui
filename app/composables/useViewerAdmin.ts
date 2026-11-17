// Calls to this UI's own server for the viewer site settings. The server accepts them because
// the core accepts the access token that is sent along.
export function useViewerAdmin() {
	const { t } = useI18n();
	const toast = useToast();
	const { accessToken } = useRestreamer();

	async function headers(extra: Record<string, string> = {}): Promise<Record<string, string>> {
		const token = await accessToken();
		return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
	}

	async function request<T>(method: 'GET' | 'PUT', path: 'config' | 'channel', body?: Record<string, unknown>): Promise<T> {
		// $fetch's route types cannot follow a type parameter: the caller says what it expects.
		return (await $fetch<unknown>(path === 'config' ? '/api/viewer/config' : '/api/viewer/channel', { method, body, headers: await headers() })) as T;
	}

	/** Stores a picture on this server; resolves to the reference the settings keep, or null (the user is told why). */
	async function upload(file: File): Promise<string | null> {
		if (file.size > 5 * 1024 * 1024) {
			toast.add({ title: t('The picture is larger than 5 MB.'), color: 'error' });
			return null;
		}
		try {
			const { url } = await $fetch<{ url: string }>('/api/viewer/images', {
				method: 'POST',
				body: file,
				headers: await headers({ 'Content-Type': 'application/octet-stream' }),
			});
			return url;
		} catch (e: unknown) {
			toast.add({ title: (e as { statusMessage?: string }).statusMessage || t('The picture could not be uploaded.'), color: 'error' });
			return null;
		}
	}

	return { request, upload };
}
