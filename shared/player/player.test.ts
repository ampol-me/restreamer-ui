import { describe, expect, test } from 'bun:test';

import { formatRgba, hexToRGBA, parseColor, toHex } from './color';
import {
	additionalChannelOptions,
	additionalChannels,
	mainChannelId,
	prepareUrl,
	resetLogo,
	sortChannels,
	sortTemplates,
	type PlayerSettings,
} from './settings';
import { checkUpload, filesize, logoImageTypes, playersiteTemplateTypes, posterImageTypes, uploadErrorMessage } from './upload';

describe('checkUpload', () => {
	test('no file', () => {
		expect(checkUpload(undefined, logoImageTypes)).toEqual({ ok: false, error: { type: 'nofiles' } });
	});

	test('accepts the listed types and maps them to an extension', () => {
		expect(checkUpload({ type: 'image/jpeg', size: 10 }, logoImageTypes)).toEqual({ ok: true, type: logoImageTypes[2]! });
		expect(checkUpload({ type: 'image/svg+xml', size: 10 }, logoImageTypes)).toMatchObject({ ok: true, type: { extension: 'svg' } });
		expect(checkUpload({ type: 'text/html', size: 10 }, playersiteTemplateTypes)).toMatchObject({ ok: true, type: { extension: 'html' } });
	});

	test('a poster may not be an SVG', () => {
		expect(checkUpload({ type: 'image/svg+xml', size: 10 }, posterImageTypes)).toEqual({
			ok: false,
			error: { type: 'mimetype', actual: 'image/svg+xml', allowed: ['image/gif', 'image/png', 'image/jpeg'] },
		});
	});

	test('a file without a type is rejected', () => {
		expect(checkUpload({ type: '', size: 10 }, logoImageTypes)).toMatchObject({ ok: false, error: { type: 'mimetype', actual: '' } });
	});

	test('wildcard subtypes', () => {
		const any = [{ mimetype: 'image/*', extension: 'img', maxSize: 5 }];
		expect(checkUpload({ type: 'image/webp', size: 5 }, any)).toMatchObject({ ok: true });
		expect(checkUpload({ type: 'video/mp4', size: 5 }, any)).toMatchObject({ ok: false });
	});

	test('size limit is inclusive: 1 MiB images, 500 KiB templates', () => {
		expect(checkUpload({ type: 'image/png', size: 1024 * 1024 }, logoImageTypes)).toMatchObject({ ok: true });
		expect(checkUpload({ type: 'image/png', size: 1024 * 1024 + 1 }, logoImageTypes)).toEqual({
			ok: false,
			error: { type: 'size', actual: 1024 * 1024 + 1, allowed: 1024 * 1024 },
		});
		expect(checkUpload({ type: 'text/html', size: 500 * 1024 + 1 }, playersiteTemplateTypes)).toMatchObject({
			ok: false,
			error: { type: 'size', allowed: 512000 },
		});
	});
});

describe('filesize', () => {
	test('matches the legacy component', () => {
		expect(filesize(0)).toBe('0 B');
		expect(filesize(1023)).toBe('1023 B');
		expect(filesize(1024)).toBe('1.0 KiB');
		expect(filesize(500 * 1024)).toBe('500.0 KiB');
		expect(filesize(1024 * 1024)).toBe('1.0 MiB');
		expect(filesize(1024 * 1024 - 1)).toBe('1.0 MiB');
		expect(filesize(1500, true)).toBe('1.5 kB');
	});
});

describe('uploadErrorMessage', () => {
	test('legacy wording', () => {
		expect(uploadErrorMessage({ type: 'nofiles' })).toBe('Please select a file to upload.');
		expect(uploadErrorMessage({ type: 'mimetype', actual: 'video/mp4', allowed: ['image/gif', 'image/png'] })).toBe(
			'The selected file type (video/mp4) is not allowed. Allowed file types are image/gif, image/png',
		);
		expect(uploadErrorMessage({ type: 'size', actual: 2 * 1024 * 1024, allowed: 1024 * 1024 })).toBe(
			'The selected file is too big (2.0 MiB). Only 1.0 MiB are allowed.',
		);
		expect(uploadErrorMessage({ type: 'read', message: 'gone' })).toBe('There was an error during upload: gone');
		expect(uploadErrorMessage({ type: 'whatever' })).toBe('Unknown upload error');
	});

	test('goes through the translator with the catalog keys', () => {
		const seen: string[] = [];
		const translate = (message: string, values: string[] = []) => {
			seen.push(message);
			return message === 'The selected file is too big (<0/>). Only <1/> are allowed.'
				? 'Zu groß (<0/>), erlaubt: <1/>'
				: `${message}|${values.join('|')}`;
		};

		expect(uploadErrorMessage({ type: 'size', actual: 2048, allowed: 1024 }, translate)).toBe('Zu groß (2.0 KiB), erlaubt: 1.0 KiB');
		expect(uploadErrorMessage({ type: 'read', message: 'x' }, translate)).toBe('There was an error during upload: {0}|x');
		expect(seen).toEqual(['The selected file is too big (<0/>). Only <1/> are allowed.', 'There was an error during upload: {0}']);
	});
});

describe('prepareUrl', () => {
	const random = () => 0.5;

	test('empty stays empty', () => {
		expect(prepareUrl('', 'http://core:8080', random)).toBe('');
	});

	test('core paths get the core address and a cache buster', () => {
		expect(prepareUrl('/channels/abc/logo.png', 'http://core:8080', random)).toBe('http://core:8080/channels/abc/logo.png?_rscache=0.5');
	});

	test('absolute addresses are kept, existing query included', () => {
		expect(prepareUrl('https://example.com/a.png?x=1', 'http://core:8080', random)).toBe('https://example.com/a.png?x=1&_rscache=0.5');
	});

	test('falls back to a plain suffix when the address is not a URL (same-origin core)', () => {
		expect(prepareUrl('/channels/abc/logo.png', '', random)).toBe('/channels/abc/logo.png?0.5');
	});
});

describe('resetLogo', () => {
	test('clears image and link, position back to top-left, rest untouched', () => {
		const settings = {
			autoplay: true,
			poster: '/p.png',
			logo: { image: '/l.png', position: 'bottom-right', link: 'https://example.com' },
		} as PlayerSettings;

		expect(resetLogo(settings)).toEqual({ autoplay: true, poster: '/p.png', logo: { image: '', position: 'top-left', link: '' } } as PlayerSettings);
		expect(settings.logo.image).toBe('/l.png');
	});
});

describe('playersite channels', () => {
	const channels = [
		{ channelid: 'c', name: 'beta' },
		{ channelid: 'a', name: 'Gamma' },
		{ channelid: 'b', name: 'Alpha' },
	];

	test('sorted by name ignoring case, input untouched', () => {
		expect(sortChannels(channels).map((c) => c.channelid)).toEqual(['b', 'c', 'a']);
		expect(channels[0]!.channelid).toBe('c');
	});

	test("the main channel is the configured one, or the selected channel for 'current' and deleted channels", () => {
		expect(mainChannelId('a', channels, 'c')).toBe('a');
		expect(mainChannelId('current', channels, 'c')).toBe('c');
		expect(mainChannelId('deleted', channels, 'c')).toBe('c');
	});

	test('additional channels exclude the main channel', () => {
		expect(additionalChannelOptions(channels, 'c').map((c) => c.channelid)).toEqual(['b', 'a']);
		expect(additionalChannels(['a', 'b', 'c'], 'c')).toEqual(['a', 'b']);
	});

	test('templates in code unit order', () => {
		expect(sortTemplates(['b', 'a', 'B'])).toEqual(['B', 'a', 'b']);
	});
});

describe('colors', () => {
	test('hexToRGBA like the legacy picker', () => {
		expect(hexToRGBA('#03F')).toBe('rgba(0,51,255,1)');
		expect(hexToRGBA('#ffffff')).toBe('rgba(255,255,255,1)');
		expect(hexToRGBA('rgba(0,0,0,.15)')).toBe('rgba(0,0,0,.15)');
		expect(hexToRGBA('red')).toBe('red');
	});

	test('parseColor reads the stored defaults and hex', () => {
		expect(parseColor('rgba(0,0,0,.15)')).toEqual({ r: 0, g: 0, b: 0, a: 0.15 });
		expect(parseColor('rgba(56, 56, 56, 1)')).toEqual({ r: 56, g: 56, b: 56, a: 1 });
		expect(parseColor('rgb(1, 2, 3)')).toEqual({ r: 1, g: 2, b: 3, a: 1 });
		expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
		expect(parseColor('red')).toBeNull();
		expect(parseColor('rgba(300,0,0,1)')).toBeNull();
	});

	test('formatRgba writes what react-colorful wrote', () => {
		expect(formatRgba({ r: 1, g: 2, b: 3, a: 0.5 })).toBe('rgba(1, 2, 3, 0.5)');
		expect(formatRgba({ r: 1, g: 2, b: 3, a: 1 })).toBe('rgba(1, 2, 3, 1)');
		expect(formatRgba({ r: 1, g: 2, b: 3, a: 0.123 })).toBe('rgba(1, 2, 3, 0.12)');
	});

	test('toHex', () => {
		expect(toHex({ r: 0, g: 51, b: 255, a: 0.2 })).toBe('#0033ff');
	});
});
