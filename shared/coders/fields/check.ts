// Assertions shared by the coder and filter form tests.
import { expect } from 'bun:test';

import type { SettingField, SettingsContext } from './types';

export const contexts: SettingsContext[] = [
	{ stream: undefined, skills: undefined },
	{ stream: null, skills: {} },
	{ stream: {}, skills: { ffmpeg: {} } },
	{ stream: { type: 'video', codec: 'h264' }, skills: { ffmpeg: { version: '4.4.1', version_major: 4, version_minor: 4 } } },
	{ stream: { type: 'audio', codec: 'aac' }, skills: { ffmpeg: { version: '7.1.0', version_major: 7, version_minor: 1 } } },
];

export function checkFields(fields: SettingField[], settings: Record<string, unknown>) {
	for (const field of fields) {
		if (field.type === 'note') {
			expect(field.key).toBe('');
			continue;
		}

		expect(settings).toHaveProperty([field.key]);
		expect(field.label.length).toBeGreaterThan(0);

		if (field.type === 'select') {
			const values = (field.options ?? []).map((o) => o.value);
			expect(values.length).toBeGreaterThan(0);
			expect(new Set(values).size).toBe(values.length);
			if (!field.allowCustom) {
				expect(values).toContain(settings[field.key] as string);
			} else {
				// "custom" is how legacy SelectCustom spells "type your own"; it is never a value.
				expect(values).not.toContain('custom');
			}
		} else {
			expect(field.options).toBeUndefined();
		}

		for (const ctx of contexts) {
			expect(typeof (field.showIf?.(settings, ctx) ?? true)).toBe('boolean');
			expect(typeof (field.disabledIf?.(settings, ctx) ?? false)).toBe('boolean');
			expect(typeof (field.showIf?.({}, ctx) ?? true)).toBe('boolean');
			expect(typeof (field.disabledIf?.({}, ctx) ?? false)).toBe('boolean');
		}

		if (field.derive) {
			for (const key of Object.keys(field.derive(settings[field.key], settings))) {
				expect(settings).toHaveProperty([key]);
			}
		}
	}
}
