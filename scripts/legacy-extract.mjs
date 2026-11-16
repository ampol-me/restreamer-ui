// One-off codemod: copy the pure ffmpeg logic out of the legacy React coder/filter
// modules into shared/. It drops React/MUI imports, every top-level declaration that
// renders JSX, `X.defaultProps = …` statements, and the matching export specifiers.
// Everything else (init, createMapping, createGraph, summarize, defaults, constants)
// is kept verbatim so the generated ffmpeg arguments stay byte-identical.
//
// Usage: bun scripts/legacy-extract.mjs
import fs from 'node:fs';
import path from 'node:path';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';
import _generate from '@babel/generator';

const traverse = _traverse.default ?? _traverse;
const generate = _generate.default ?? _generate;

const ROOT = path.resolve(import.meta.dirname, '..');
const LEGACY = path.join(ROOT, 'legacy/src');

const jobs = [
	['misc/coders/Encoders/video', 'shared/coders/encoders/video'],
	['misc/coders/Encoders/audio', 'shared/coders/encoders/audio'],
	['misc/coders/Decoders/video', 'shared/coders/decoders/video'],
	['misc/coders/Decoders/audio', 'shared/coders/decoders/audio'],
	['misc/filters/video', 'shared/filters/video'],
	['misc/filters/audio', 'shared/filters/audio'],
];

const UI_IMPORT =
	/^(react|@mui\/|@fortawesome\/|@lingui\/react)|\/(Select|SelectCustom|Checkbox|TextField|MultiSelect|MultiSelectOption|ColorPicker|settings\/(Audio|Video))$/;

// True for anything that renders or is a React component (JSX, or hooks via `React.`).
function containsJSX(nodePath) {
	let found = false;
	nodePath.traverse({
		MemberExpression(p) {
			if (p.node.object.type === 'Identifier' && p.node.object.name === 'React') {
				found = true;
				p.stop();
			}
		},
		JSXElement(p) {
			found = true;
			p.stop();
		},
		JSXFragment(p) {
			found = true;
			p.stop();
		},
	});
	return found;
}

function extract(file) {
	const code = fs.readFileSync(file, 'utf8');
	const ast = parse(code, { sourceType: 'module', plugins: ['jsx'] });
	const removed = new Set();

	traverse(ast, {
		Program(program) {
			for (const stmt of program.get('body')) {
				const node = stmt.node;

				if (stmt.isImportDeclaration()) {
					const src = node.source.value;
					if (UI_IMPORT.test(src)) {
						stmt.remove();
					} else if (src === '@lingui/macro') {
						// `t` stays (rewritten to our runtime helper); `Trans` is JSX-only.
						node.specifiers = node.specifiers.filter((s) => s.imported?.name === 't');
						if (node.specifiers.length === 0) stmt.remove();
						else node.source.value = '../../../i18n';
					} else if (src.endsWith('/helper')) {
						node.source.value = '../../helper';
					}
					continue;
				}

				if (stmt.isFunctionDeclaration() && containsJSX(stmt)) {
					removed.add(node.id.name);
					stmt.remove();
					continue;
				}

				if (stmt.isVariableDeclaration() && containsJSX(stmt)) {
					for (const d of node.declarations) removed.add(d.id.name);
					stmt.remove();
					continue;
				}

				// Foo.defaultProps = {...}
				if (
					stmt.isExpressionStatement() &&
					node.expression.type === 'AssignmentExpression' &&
					node.expression.left.type === 'MemberExpression' &&
					node.expression.left.property.name === 'defaultProps'
				) {
					stmt.remove();
					continue;
				}
			}
		},
	});

	// Remove export specifiers of removed bindings (e.g. `Coder as component`).
	traverse(ast, {
		ExportNamedDeclaration(p) {
			p.node.specifiers = p.node.specifiers.filter((s) => !removed.has(s.local.name));
		},
	});

	// Drop imports that were only used by the removed UI code.
	traverse(ast, {
		Program(program) {
			program.scope.crawl();
			for (const stmt of program.get('body')) {
				if (!stmt.isImportDeclaration()) continue;
				stmt.node.specifiers = stmt.node.specifiers.filter((s) => program.scope.getBinding(s.local.name)?.referenced);
				if (stmt.node.specifiers.length === 0) stmt.remove();
			}
		},
	});

	// Anything still referencing a removed binding is a bug in the extraction.
	traverse(ast, {
		Identifier(p) {
			if (removed.has(p.node.name) && p.isReferencedIdentifier()) {
				throw new Error(`${file}: still references removed UI binding "${p.node.name}"`);
			}
		},
	});

	const out = generate(ast, { retainLines: false, comments: true }).code;
	const rel = path.relative(ROOT, file);
	return `// Generated from ${rel} by scripts/legacy-extract.mjs, then maintained by hand.\n// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.\n${out}\n`;
}

let count = 0;
for (const [from, to] of jobs) {
	const srcDir = path.join(LEGACY, from);
	const dstDir = path.join(ROOT, to);
	fs.mkdirSync(dstDir, { recursive: true });
	for (const name of fs.readdirSync(srcDir)) {
		if (!name.endsWith('.js') || name.endsWith('.test.js') || name === 'index.js') continue;
		fs.writeFileSync(path.join(dstDir, name.replace(/\.js$/, '.ts')), extract(path.join(srcDir, name)));
		count++;
	}
}
console.log(`extracted ${count} modules`);
