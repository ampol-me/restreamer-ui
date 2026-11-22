// Regenerates shared/__fixtures__/core/*.json from the untouched LEGACY core client
// (legacy/src/utils/restreamer.js + its legacy metadata/api/storage/anonymizer modules).
//
// Usage (repo root, needs legacy/node_modules):  bun scripts/legacy/gen-core-fixtures.ts
//
// The scenarios live in shared/core/restreamer.test.ts so that the generator and the parity test can
// never drift apart: this script runs that test file against the legacy implementation
// (RESTREAMER_IMPL=legacy) in write mode (UPDATE_FIXTURES=1), then once more in compare mode.
import path from 'node:path';

const root = path.join(import.meta.dir, '..', '..');
const preload = './' + path.relative(root, path.join(import.meta.dir, 'preload.ts'));
const cmd = ['bun', 'test', '--preload', preload, 'shared/core/restreamer.test.ts'];

for (const update of ['1', '0']) {
	const proc = Bun.spawnSync(cmd, {
		cwd: root,
		env: { ...process.env, RESTREAMER_IMPL: 'legacy', UPDATE_FIXTURES: update },
		stdout: 'inherit',
		stderr: 'inherit',
	});

	if (proc.exitCode !== 0) {
		console.error(`legacy run failed (UPDATE_FIXTURES=${update})`);
		process.exit(proc.exitCode ?? 1);
	}
}

console.log('shared/__fixtures__/core regenerated from legacy and verified against it.');
