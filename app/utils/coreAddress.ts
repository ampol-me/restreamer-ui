// Where is the datarhei-core this UI talks to?
// Same rules as the legacy UI: the core serves us at <base>/ui/, so the API lives at <base>.
// `?address=` overrides it (development against a remote core), then NUXT_PUBLIC_CORE_ADDRESS.
export function resolveCoreAddress(location: Pick<Location, 'protocol' | 'host' | 'pathname' | 'search'>, configured = ''): string {
	const params = new URLSearchParams(location.search.substring(1));
	const fromQuery = params.get('address');
	if (fromQuery) {
		return fromQuery;
	}

	if (configured) {
		return configured;
	}

	let address = location.protocol + '//' + location.host;
	if (location.pathname.endsWith('/ui/')) {
		address += location.pathname.replace(/ui\/$/, '');
	}

	return address;
}
