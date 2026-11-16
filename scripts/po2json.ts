// Convert the legacy lingui catalogs (legacy/src/locales/<lang>/messages.po) into flat
// vue-i18n JSON files keyed by the English source text. Untranslated entries are left
// out so the runtime falls back to the key (= English).
//
// Usage: bun scripts/po2json.ts
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dir, '..');
const SRC = path.join(ROOT, 'legacy/src/locales');
const DST = path.join(ROOT, 'i18n/locales');

const unquote = (s: string): string => JSON.parse(s);

export function parsePo(text: string): Map<string, string> {
	const entries = new Map<string, string>();
	let id: string | null = null;
	let str: string | null = null;
	let target: 'id' | 'str' | null = null;

	const flush = () => {
		if (id !== null && id.length > 0 && str !== null) entries.set(id, str);
		id = str = target = null;
	};

	for (const raw of text.split('\n')) {
		const line = raw.trim();
		if (line.startsWith('msgid ')) {
			flush();
			id = unquote(line.slice(6));
			target = 'id';
		} else if (line.startsWith('msgstr ')) {
			str = unquote(line.slice(7));
			target = 'str';
		} else if (line.startsWith('"')) {
			if (target === 'id') id += unquote(line);
			else if (target === 'str') str += unquote(line);
		} else if (line.length === 0) {
			flush();
		}
	}
	flush();

	return entries;
}

// vue-i18n message syntax gives "@" (linked messages) and "|" (plural forms) a meaning;
// lingui does not. Emit them as literal interpolations.
export function escapeMessage(message: string): string {
	return message.replace(/[@|]/g, (c) => `{'${c}'}`);
}

if (import.meta.main) {
	fs.mkdirSync(DST, { recursive: true });
	for (const lang of fs.readdirSync(SRC).sort()) {
		const file = path.join(SRC, lang, 'messages.po');
		if (!fs.existsSync(file)) continue;

		const out: Record<string, string> = {};
		let total = 0;
		for (const [id, str] of parsePo(fs.readFileSync(file, 'utf8'))) {
			total++;
			const message = escapeMessage(str.length > 0 ? str : id);
			// Same as the key: the fallback renders it already.
			if (message !== id) out[id] = message;
		}

		const sorted = Object.fromEntries(Object.entries(out).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
		fs.writeFileSync(path.join(DST, `${lang}.json`), JSON.stringify(sorted, null, '\t') + '\n');
		console.log(`${lang}: ${Object.keys(sorted).length}/${total} messages`);
	}
}
