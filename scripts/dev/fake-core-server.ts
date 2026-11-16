// A local stand-in for datarhei-core to develop the UI against without touching a real one.
// It serves the test suite's FakeCore (shared/__fixtures__/core/fake-core.ts) over HTTP.
//
//   bun scripts/dev/fake-core-server.ts            # http://localhost:3222
//   NUXT_PUBLIC_CORE_ADDRESS=http://localhost:3222 NUXT_CORE_ADDRESS=http://localhost:3222 bun run dev
//
// Login: admin / secret (test credentials that only exist in the fake).
import { ADDRESS, FakeCore } from '../../shared/__fixtures__/core/fake-core';

const port = Number(process.env.PORT || 3222);
const core = new FakeCore();

const cors = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

Bun.serve({
	port,
	async fetch(request) {
		if (request.method === 'OPTIONS') {
			return new Response(null, { status: 204, headers: cors });
		}

		const url = new URL(request.url);

		// FakeCore reads these two headers by their canonical names, like the client sends them.
		const headers: Record<string, string> = {};
		if (request.headers.has('authorization')) headers.Authorization = request.headers.get('authorization')!;
		if (request.headers.has('content-type')) headers['Content-Type'] = request.headers.get('content-type')!;

		const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
		const body = hasBody ? await request.text() : undefined;

		const response = await core.fetch(ADDRESS + url.pathname + url.search, { method: request.method, headers, body: body === '' ? undefined : body });

		const out = new Headers(response.headers);
		for (const [name, value] of Object.entries(cors)) out.set(name, value);

		return new Response(response.body, { status: response.status, headers: out });
	},
});

console.log(`fake core listening on http://localhost:${port} (login: admin / secret)`);
