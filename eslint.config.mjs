// @ts-check
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt({
	ignores: ['legacy/**', 'public/_player/**', 'public/_playersite/**'],
});
