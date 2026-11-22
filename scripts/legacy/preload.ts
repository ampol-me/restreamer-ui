// bun preload: lets legacy React modules be imported under bun (see lingui-macro-stub.ts).
// Usage: bun --preload ./scripts/legacy/preload.ts <script>   (tests: `preload` in bunfig.toml)
import { plugin } from 'bun';
import fs from 'node:fs';
import path from 'node:path';

const stub = fs.readFileSync(path.join(import.meta.dir, 'lingui-macro-stub.ts'), 'utf8');

plugin({
	name: 'legacy-lingui-macro',
	setup(build) {
		// Replace the babel macro entry point with the runtime stub.
		build.onLoad({ filter: /@lingui[\\/]macro[\\/]dist[\\/]index\.(mjs|cjs|js)$/ }, () => ({ contents: stub, loader: 'ts' }));
	},
});
