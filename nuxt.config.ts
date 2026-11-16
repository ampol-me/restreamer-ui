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
		defaultLocale: 'en',
		langDir: 'locales',
		locales: [{ code: 'en', name: 'English', file: 'en.json' }],
		detectBrowserLanguage: { useCookie: true, cookieKey: 'restreamer_lang', fallbackLocale: 'en' },
	},

	compatibilityDate: '2026-06-30',
});
