import { expect, test } from 'bun:test';
import { escapeMessage, parsePo, repairPlaceholders } from './po2json';

test('parsePo reads single and multi-line entries and skips the header', () => {
	const po = [
		'msgid ""',
		'msgstr ""',
		'"Language: de\\n"',
		'',
		'#: src/a.js:1',
		'msgid "Login"',
		'msgstr "Anmelden"',
		'',
		'msgid "A \\"quoted\\" "',
		'"long id"',
		'msgstr ""',
		'"Ein langer "',
		'"Text"',
		'',
	].join('\n');
	expect([...parsePo(po)]).toEqual([
		['Login', 'Anmelden'],
		['A "quoted" long id', 'Ein langer Text'],
	]);
});

test('escapeMessage neutralises vue-i18n syntax characters', () => {
	expect(escapeMessage('RTMP(e|s) a@b')).toBe("RTMP(e{'|'}s) a{'@'}b");
});

test('repairPlaceholders restores translated placeholder names', () => {
	expect(repairPlaceholders('Edit: {title}', 'Editar: {título}')).toBe('Editar: {title}');
	expect(repairPlaceholders('Default {0} ({1} seconds)', 'Standard {0} ({1} Sekunden)')).toBe('Standard {0} ({1} Sekunden)');
	// Extra but syntactically valid placeholders are left alone; unusable ones are an error.
	expect(repairPlaceholders('Created', 'Service "{0}" created')).toBe('Service "{0}" created');
	expect(() => repairPlaceholders('Edit: {title}', '{é} {ü}')).toThrow();
});
