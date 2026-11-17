// main.css carries the Phila tokens by value (see the comment there). This keeps it honest:
// every colour, spacing and radius token of design/phila/tokens.json must appear with the same
// value for the light and the dark theme, and the logos served to browsers must be the supplied files.
import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dir, '..', '..', '..');
const tokens = JSON.parse(readFileSync(join(root, 'design/phila/tokens.json'), 'utf8'));
const css = readFileSync(join(import.meta.dir, 'main.css'), 'utf8');

// The first `:root { … }` block holds the light values, the first `.dark { … }` block the dark overrides.
const block = (selector: string) => {
	const start = css.indexOf(`\n${selector} {`);
	expect(start).toBeGreaterThan(-1);
	return css.slice(start, css.indexOf('\n}', start));
};
const declared = (source: string) => Object.fromEntries([...source.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2]!.trim()]));

const light = declared(block(':root'));
const dark = { ...light, ...declared(block('.dark')) };

describe('main.css matches design/phila/tokens.json', () => {
	for (const token of tokens.color.tokens) {
		test(`color ${token.name}`, () => {
			if (typeof token.value === 'string') {
				// an alias such as "{navy-text}"
				expect(light[token.name]).toBe(`var(--${token.value.slice(1, -1)})`);
				return;
			}
			expect(light[token.name]).toBe(token.value.light);
			expect(dark[token.name]).toBe(token.value.dark);
		});
	}

	test('spacing', () => {
		for (const token of tokens.spacing.tokens) {
			expect(light[token.name]).toBe(token.value);
		}
	});

	test('radius: sm and md come from the vendored Tailwind theme', () => {
		const theme = readFileSync(join(root, 'design/phila/tailwind-theme.css'), 'utf8');
		for (const token of tokens.radius.tokens.filter((t: { name: string }) => t.name !== 'radius-full')) {
			expect(theme).toContain(`--${token.name}: ${token.value};`);
		}
	});

	test('fonts', () => {
		expect(css).toContain("--font-sans: 'IBM Plex Sans Thai', 'IBM Plex Sans', system-ui, sans-serif;");
		expect(tokens.type.families.sans).toBe('"IBM Plex Sans Thai", "IBM Plex Sans", system-ui, sans-serif');
		expect(tokens.type.families.mono.startsWith('"IBM Plex Mono"')).toBe(true);
	});
});

test('the logos in public/brand are the supplied files, byte for byte', () => {
	for (const name of ['phila-mark', 'phila-mark-reverse', 'phila-mark-small', 'phila-mark-reverse-small']) {
		const supplied = readFileSync(join(root, `design/phila/assets/logos/${name}.svg`));
		expect(readFileSync(join(root, `public/brand/${name}.svg`)).equals(supplied)).toBe(true);
	}
});
