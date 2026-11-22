// Runtime stand-in for @lingui/macro (a babel macro that cannot run outside compilation).
// Only used to execute legacy modules under bun when generating/checking golden data.
export const t = (strings: TemplateStringsArray | string, ...values: unknown[]) =>
	typeof strings === 'string' ? strings : strings.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''), '');
export const Trans = (props: { children?: unknown }) => props.children ?? null;
export const Plural = () => null;
export const Select = () => null;
export const defineMessage = (m: unknown) => m;
export const msg = t;
export const plural = () => '';
