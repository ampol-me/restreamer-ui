import { expect, test } from 'bun:test';
import { resolveCoreAddress } from './coreAddress';

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
