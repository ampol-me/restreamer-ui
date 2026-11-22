// @ts-nocheck
// Generates the golden fixtures for shared/services/services.test.ts by executing the LEGACY
// service components (legacy/src/views/Publication/Services/*.js).
//
// Usage, from the repo root (needs `legacy/node_modules`):
//
//   bun --preload ./scripts/legacy/preload.ts scripts/legacy/gen-services-fixtures.ts
//
// The legacy createOutput() is a closure inside the React component and is only called from the
// change handler of a form element. The service components don't use hooks, so the component is
// called as a plain function, then the onChange handler of the first text/select element in the
// returned element tree is invoked with the value that element already has. That leaves the
// settings as init() made them and reports (outputs, settings) to the onChange spy.
//
// The uuid in the youtube/twitter HLS outputs is replaced by 'UUID'.
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dir, '../..');
const srcdir = join(root, 'legacy/src/views/Publication/Services');
const outdir = join(root, 'shared/__fixtures__/services');

const clone = (v) => JSON.parse(JSON.stringify(v));

const skills = (major, video) => ({
	ffmpeg: { version: major + '.1.2', version_major: major, version_minor: 1 },
	protocols: ['rtmp', 'rtmps', 'https', 'http', 'srt', 'udp', 'tcp', 'rtp', 'icecast'],
	formats: ['flv', 'hls', 'mpegts', 'dash', 'rtsp', 'adts', 'webm', 'image2', 'fbdev'],
	codecs: { audio: ['aac', 'mp3'], video },
	devices: { fbdev: [{ id: '/dev/fb0', name: 'fb0', extra: 'vc4drmfb' }] },
});
const metadata = { name: 'My Stream', description: 'Desc', license: 'CC BY 4.0' };
const contexts = [
	{ skills: skills(5, ['h264']), metadata, streams: [{ type: 'audio', codec: 'aac' }] },
	{ skills: skills(6, ['h264', 'hevc', 'av1', 'vp9']), metadata, streams: [{ type: 'video', codec: 'h264' }, { type: 'audio', codec: 'mp3' }] },
	{ skills: skills(6, ['h264']), metadata, streams: [{ type: 'audio', codec: 'opus' }] },
	{ skills: skills(5, ['h264', 'hevc', 'av1', 'vp9']), metadata, streams: [{ type: 'audio', codec: 'vorbis' }] },
];

// Depth-first search for the first element that has a string `value` and an `onChange` handler.
function findInput(node) {
	if (Array.isArray(node)) {
		for (const child of node) {
			const found = findInput(child);
			if (found) return found;
		}
		return null;
	}
	if (!node || typeof node !== 'object' || !node.props) return null;
	if (typeof node.props.onChange === 'function' && typeof node.props.value === 'string') return node;
	return findInput(node.props.children);
}

// Run the legacy component. Returns null if there's no element to trigger the change handler with.
function run(service, settings, ctx) {
	let result = null;
	const tree = service.component({
		settings: clone(settings),
		skills: clone(ctx.skills),
		metadata: clone(ctx.metadata),
		streams: clone(ctx.streams),
		onChange: (outputs, s) => {
			result = { outputs, settings: s };
		},
	});
	const input = findInput(tree);
	if (input === null) return null;
	input.props.onChange({ target: { value: input.props.value } });
	return clone(result);
}

function fill(o, mode) {
	const r = {};
	for (const [k, v] of Object.entries(o)) {
		if (typeof v === 'string') r[k] = mode === 1 ? 'v_' + k : mode === 2 ? '' : v + 'x@ /';
		else if (typeof v === 'boolean') r[k] = mode === 3 ? v : !v;
		else if (Array.isArray(v)) r[k] = mode === 2 ? [] : ['a', 'b'];
		else if (v && typeof v === 'object') r[k] = fill(v, mode);
		else r[k] = v;
	}
	return r;
}

// All (nested) settings whose default is one of the values of a legacy <MenuItem>, with all values of that select.
function selects(tree, out = []) {
	if (Array.isArray(tree)) {
		tree.forEach((child) => selects(child, out));
	} else if (tree && typeof tree === 'object' && tree.props) {
		const children = [].concat(tree.props.children ?? []).flat();
		const values = children.filter((c) => c && c.props && typeof c.props.value === 'string' && c.props.onChange === undefined).map((c) => c.props.value);
		if (typeof tree.props.value === 'string' && typeof tree.props.onChange === 'function' && values.length > 1) {
			out.push({ current: tree.props.value, values });
		} else {
			selects(tree.props.children, out);
		}
	}
	return out;
}

function setFirst(o, current, value) {
	for (const [k, v] of Object.entries(o)) {
		if (v === current) {
			o[k] = value;
			return true;
		}
		if (v && typeof v === 'object' && !Array.isArray(v) && setFirst(v, current, value)) return true;
	}
	return false;
}

mkdirSync(outdir, { recursive: true });

const fixtures = {};
let total = 0;
let skipped = 0;

for (const file of readdirSync(srcdir).filter((f) => f.endsWith('.js') && f !== 'index.js').sort()) {
	const service = await import(join(srcdir, file));
	const ctx0 = contexts[1];

	const base = run(service, {}, ctx0).settings;
	const variants = [{}, fill(base, 1), fill(base, 2), fill(base, 3), fill(base, 4)];

	// every value of every select, once on top of the defaults and once on top of filled settings
	const tree = service.component({ settings: {}, ...clone(ctx0), onChange: () => {} });
	for (const select of selects(tree)) {
		for (const value of select.values) {
			for (const from of [{ ...base, stream_key: 'key', key: 'key', username: 'user', password: 'pass word' }, base]) {
				const v = clone(from);
				if (setFirst(v, select.current, value)) variants.push(v);
			}
		}
	}

	if (service.id === 'datarheicore') {
		variants.push(
			{ v2_address: 'srt://example.com:6000?mode=caller&transtype=live&streamid=abc' },
			{ v2_address: 'rtmp://example.com/live/stream' },
			{ protocol: 'srt', base_url: 'example.com:6000', app_path: '', stream_name: 'stream', token: 'abc', srt_passphrase: 'secret' },
			{ protocol: 'rtmp', base_url: 'example.com:1935', app_path: 'live', stream_name: 'stream', token: '', srt_passphrase: '' },
		);
	}
	if (['youtube', 'twitter'].includes(service.id)) {
		variants.push({ mode: 'hls', stream_key: 'key' }, { mode: 'hls', stream_key: 'key', primary: false, backup: true, region: 'va' });
	}

	const cases = [];
	const seen = new Set();
	for (let c = 0; c < contexts.length; c++) {
		for (const settings of variants) {
			const key = c + JSON.stringify(settings);
			if (seen.has(key)) continue;
			seen.add(key);

			const result = run(service, settings, contexts[c]);
			if (result === null) {
				skipped++;
				continue;
			}
			total++;
			// the settings after init() don't depend on the context, keep them once
			cases.push(c === 0 ? { context: c, input: settings, settings: result.settings, outputs: result.outputs } : { context: c, input: settings, outputs: result.outputs });
		}
	}

	fixtures[service.id] = cases;
}

const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/g;
const lines = Object.keys(fixtures).map((id) => {
	// only these two generate a uuid (wettercom has a fixed one in its default server URL)
	const scrub = (line) => (['youtube', 'twitter'].includes(id) ? line.replace(uuid, 'UUID') : line);
	return JSON.stringify(id) + ': [\n' + fixtures[id].map((c) => '\t' + scrub(JSON.stringify(c))).join(',\n') + '\n]';
});

writeFileSync(join(outdir, 'contexts.json'), JSON.stringify(contexts, null, '\t') + '\n');
writeFileSync(join(outdir, 'outputs.json'), '{\n' + lines.join(',\n') + '\n}\n');

console.log(`${Object.keys(fixtures).length} services, ${total} cases written to ${outdir} (${skipped} skipped: no element to trigger)`);
