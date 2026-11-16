import { expect, test } from 'bun:test';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { licenseInfo, licenses } from './license';

test('every selectable license except "none" has badge, link and description', () => {
	for (const license of licenses) {
		const info = licenseInfo(license);
		if (license === 'none') {
			expect(info).toBeNull();
			continue;
		}
		expect(info).not.toBeNull();
		expect(info!.description.length).toBeGreaterThan(50);
		expect(existsSync(join(import.meta.dir, '..', 'public', 'licenses', info!.image))).toBe(true);
	}
});

test('links follow the license kind and version', () => {
	expect(licenseInfo('CC0 1.0')!.link).toBe('https://creativecommons.org/licenses/zero/1.0/');
	expect(licenseInfo('CC BY 4.0')!.link).toBe('https://creativecommons.org/licenses/by/4.0/');
	expect(licenseInfo('CC BY-NC-ND 4.0')!.link).toBe('https://creativecommons.org/licenses/by-nc-nd/4.0/');
	expect(licenseInfo('CC BY-SA 3.0')!.link).toBe('https://creativecommons.org/licenses/by-sa/3.0/');
});

test('unknown values have no info', () => {
	expect(licenseInfo('')).toBeNull();
	expect(licenseInfo('MIT')).toBeNull();
});
