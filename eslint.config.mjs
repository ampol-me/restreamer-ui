// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt(
	{
		ignores: ['legacy/**', 'public/_player/**', 'public/_playersite/**'],
	},
	{
		// Prettier writes void elements as <img />.
		rules: {
			'vue/html-self-closing': ['warn', { html: { void: 'always', normal: 'always', component: 'always' } }],
		},
	},
	{
		// shared/ starts as a 1:1 port of the legacy logic (kept byte-compatible by parity
		// tests). Style-only rules stay off there until each module is typed by hand, so the
		// port is not "tidied" into behaving differently.
		files: ['shared/**/*.ts', 'scripts/legacy/**/*.ts'],
		linterOptions: { reportUnusedDisableDirectives: 'off' },
		rules: {
			'prefer-const': 'off',
			'no-var': 'off',
			'no-useless-assignment': 'off',
			'no-extra-boolean-cast': 'off',
			'@typescript-eslint/no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
		},
	},
);
