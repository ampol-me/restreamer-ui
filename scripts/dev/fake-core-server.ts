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

// SEED=1: give the fake a configured channel (H.264 + AAC from a network source, passed through),
// so that pages which need an ingest have one. It goes through the real client and save sequence.
if (process.env.SEED === '1') {
	const { default: Restreamer } = await import('../../shared/core/restreamer');
	const M = await import('../../shared/metadata');
	const { saveIngest } = await import('../../shared/ingest/save');

	const client = new Restreamer(`http://localhost:${port}`);
	await client.Validate();
	await client.Login('admin', 'secret');
	const channelid = client.GetCurrentChannelID();

	const metadata = M.initIngestMetadata({});
	metadata.meta.name = 'Seeded channel';
	metadata.sources = [
		M.initSource('network', {
			type: 'network',
			settings: { mode: 'pull', address: 'rtsp://camera.example/stream' },
			inputs: [{ address: 'rtsp://camera.example/stream', options: ['-fflags', '+genpts'] }],
			streams: [
				{ url: 'rtsp://camera.example/stream', index: 0, stream: 0, type: 'video', codec: 'h264', width: 1920, height: 1080, pix_fmt: 'yuv420p' },
				{ url: 'rtsp://camera.example/stream', index: 0, stream: 1, type: 'audio', codec: 'aac', sampling_hz: 48000, layout: 'stereo', channels: 2 },
			],
		}),
	];

	const profile = M.initProfile({});
	profile.video = { ...profile.video, source: 0, stream: 0 };
	profile.video.encoder = { coder: 'copy', codec: 'h264', settings: {}, mapping: { global: [], local: ['-codec:v', 'copy'], filter: [] } };
	profile.audio = { ...profile.audio, source: 0, stream: 1 };
	profile.audio.encoder = { coder: 'copy', codec: 'aac', settings: {}, mapping: { global: [], local: ['-codec:a', 'copy'], filter: [] } };
	metadata.profiles = [profile];

	const result = await saveIngest(client, channelid, metadata);
	client.Reset();
	console.log(result.ok ? `seeded channel ${channelid}` : `seeding failed: ${JSON.stringify(result.problems)}`);
}
