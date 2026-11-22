// @ts-nocheck
// Generates the golden fixtures for shared/metadata.test.ts by executing the LEGACY modules
// (legacy/src/utils/metadata.js and legacy/src/version.js) with the inputs from
// shared/__fixtures__/metadata/cases.ts.
//
// Usage, from the repo root (needs `legacy/node_modules`):
//
//   bun --preload ./scripts/legacy/preload.ts scripts/legacy/gen-metadata-fixtures.ts
//
// The preload only stubs `@lingui/macro`. The encoder/filter registries, semver and
// metadata.js itself are the original legacy code.
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { runCases, exportNames } from '../../shared/__fixtures__/metadata/cases';

const root = resolve(import.meta.dir, '../..');
const outdir = join(root, 'shared/__fixtures__/metadata');

const legacy = await import(join(root, 'legacy/src/utils/metadata.js'));
const legacyVersion = await import(join(root, 'legacy/src/version.js'));

const names = Object.keys(legacy).sort();
if (JSON.stringify(names) !== JSON.stringify(exportNames.slice().sort())) {
	throw new Error('legacy exports changed: ' + names.join(', '));
}

mkdirSync(outdir, { recursive: true });
for (const file of readdirSync(outdir)) {
	if (file.endsWith('.json')) {
		rmSync(join(outdir, file));
	}
}

const write = (name, data) => {
	writeFileSync(join(outdir, name + '.json'), JSON.stringify(data, null, '\t') + '\n');
};

// One case per line keeps the fixtures small and the diffs readable.
const writeCases = (name, cases) => {
	const lines = Object.keys(cases).map((key) => JSON.stringify(key) + ': ' + JSON.stringify(cases[key]));
	writeFileSync(join(outdir, name + '.json'), '{\n' + lines.join(',\n') + '\n}\n');
};

const groups = runCases(legacy);
let total = 0;

for (const group in groups) {
	writeCases(group, groups[group]);
	total += Object.keys(groups[group]).length;
	console.log(group + ': ' + Object.keys(groups[group]).length + ' cases');
}

write('version', { exports: Object.keys(legacyVersion).sort(), values: { ...legacyVersion } });
write('exports', names);

console.log('total: ' + total + ' cases');
