// Framework-free translation hook for the shared logic layer.
// Legacy code used lingui's t`Hello ${name}`; here that is t('Hello {name}', { name }).
// The app installs the real translator (vue-i18n) via setTranslator(); tests use the default.

export type Translator = (message: string, values?: Record<string, unknown>) => string;

const interpolate: Translator = (message, values = {}) => message.replace(/\{(\w+)\}/g, (m, key) => (key in values ? String(values[key]) : m));

let translator: Translator = interpolate;

export function setTranslator(fn: Translator | null): void {
	translator = fn ?? interpolate;
}

export function t(message: string, values?: Record<string, unknown>): string {
	return translator(message, values);
}
