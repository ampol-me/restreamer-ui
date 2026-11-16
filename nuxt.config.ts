// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
	modules: ['@nuxt/eslint', '@nuxt/ui', '@nuxtjs/i18n'],

	// datarhei-core serves the UI as static files under /ui/, so this is a pure SPA.
	ssr: false,

	app: {
		// Overridable with NUXT_APP_BASE_URL (e.g. "/" for `nuxt dev`).
		baseURL: '/ui/',
		head: {
			title: 'Restreamer',
			meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
		},
	},

	// Hash routing: deep links keep working without server-side rewrites in the core.
	router: {
		options: { hashMode: true },
	},

	css: ['~/assets/css/main.css'],

	devtools: { enabled: true },

	runtimeConfig: {
		public: {
			// Optional fixed core address (e.g. for development). Empty = derive from window.location.
			coreAddress: '',
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
