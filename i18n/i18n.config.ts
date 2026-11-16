// Like the legacy lingui catalogs, messages are keyed by their English source text
// ("Login failed. Check …"), so the 15 existing translations carry over unchanged.
// vue-i18n would read such keys as dotted paths; resolve them as flat keys instead,
// and render the (English) key itself — with its {placeholders} — when a translation is missing.
export default defineI18nConfig(() => ({
	legacy: false,
	fallbackLocale: 'en',
	messageResolver: (messages: unknown, key: string) => (messages as Record<string, unknown>)[key] ?? null,
	fallbackFormat: true,
	missingWarn: false,
	fallbackWarn: false,
}));
