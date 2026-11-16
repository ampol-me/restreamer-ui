import { expect, test } from 'bun:test';
import { resolveCoreAddress, resolveCoreAddressForTab } from './coreAddress';

const loc = (pathname: string, search = '') => ({ protocol: 'https:', host: 'core.example:8080', pathname, search });

test('served by the core under /ui/', () => {
	expect(resolveCoreAddress(loc('/ui/'))).toBe('https://core.example:8080/');
});

test('served under a sub-path', () => {
	expect(resolveCoreAddress(loc('/foo/ui/'))).toBe('https://core.example:8080/foo/');
});

test('served from somewhere else (dev server)', () => {
	expect(resolveCoreAddress(loc('/'))).toBe('https://core.example:8080');
});

test('?address= wins over configuration', () => {
	expect(resolveCoreAddress(loc('/ui/', '?address=https%3A%2F%2Fother.example'), 'https://configured.example')).toBe('https://other.example');
});

test('configured address is used when there is no query override', () => {
	expect(resolveCoreAddress(loc('/ui/'), 'https://configured.example')).toBe('https://configured.example');
});

test('an ?address= override is remembered for the tab', () => {
	const data = new Map<string, string>();
	const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) };

	expect(resolveCoreAddressForTab(loc('/'), 'https://configured.example', storage)).toBe('https://configured.example');
	expect(resolveCoreAddressForTab(loc('/', '?address=http%3A%2F%2Flocalhost%3A3222'), 'https://configured.example', storage)).toBe('http://localhost:3222');
	// later page loads without the parameter
	expect(resolveCoreAddressForTab(loc('/abc/edit'), 'https://configured.example', storage)).toBe('http://localhost:3222');
	// a new override replaces it
	expect(resolveCoreAddressForTab(loc('/', '?address=https%3A%2F%2Fother.example'), '', storage)).toBe('https://other.example');
	expect(resolveCoreAddressForTab(loc('/'), '', storage)).toBe('https://other.example');
});
