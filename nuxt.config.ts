// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n'],

	// The admin UI is a client-side app that talks to the datarhei-core API from the browser.
	// The Nitro server next to it (Bun) only serves the View Portal: passcode check, sessions
	// and the HLS proxy (server/).
	ssr: false,

	app: {
		head: {
			title: 'Phila Restream',
			meta: [
				{ name: 'viewport', content: 'width=device-width, initial-scale=1' },
				{ name: 'theme-color', content: '#28428c' },
			],
		},
	},

	css: ['~/assets/css/main.css'],

	devtools: { enabled: true },

	runtimeConfig: {
		// NUXT_CORE_ADDRESS: how this server reaches the core (may be an internal address such as
		// http://core:8080). Required for the View Portal; falls back to the public address.
		coreAddress: '',
		public: {
			// NUXT_PUBLIC_CORE_ADDRESS: the core as seen from the browser. Empty = same origin.
			coreAddress: '',
		},
	},

	nitro: {
		preset: 'bun',
		storage: {
			// Portal settings and the session signing key. Mount a volume here in production.
			data: { driver: 'fs', base: './.data/kv' },
		},
	},

	i18n: {
		strategy: 'no_prefix',
		// Messages inherited from lingui contain <0>…</0> rich-text markers; they are rendered
		// through slots, never as raw HTML.
		compilation: { strictMessage: false },
		defaultLocale: 'en',
		langDir: 'locales',
		// Generated from the legacy lingui catalogs by scripts/po2json.ts.
		locales: [
			{ code: 'en', name: 'English', file: 'en.json' },
			{ code: 'da', name: 'Dansk', file: 'da.json' },
			{ code: 'de', name: 'Deutsch', file: 'de.json' },
			{ code: 'el', name: 'Ελληνικά', file: 'el.json' },
			{ code: 'es', name: 'Español', file: 'es.json' },
			{ code: 'fr', name: 'Français', file: 'fr.json' },
			{ code: 'it', name: 'Italiano', file: 'it.json' },
			{ code: 'ko', name: '한국어', file: 'ko.json' },
			{ code: 'pl', name: 'Polski', file: 'pl.json' },
			{ code: 'pt-br', name: 'Português', file: 'pt-br.json' },
			{ code: 'ru', name: 'Русский', file: 'ru.json' },
			{ code: 'sl', name: 'Slovenščina', file: 'sl.json' },
			{ code: 'tr', name: 'Türkçe', file: 'tr.json' },
			{ code: 'uk', name: 'Українська мова', file: 'uk.json' },
			{ code: 'zh-hans', name: '中文(简体)', file: 'zh-hans.json' },
		],
		detectBrowserLanguage: { useCookie: true, cookieKey: 'restreamer_lang', fallbackLocale: 'en' },
	},

	compatibilityDate: '2026-06-30',
});
