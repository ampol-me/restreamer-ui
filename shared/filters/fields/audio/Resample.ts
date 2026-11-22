// Form of legacy/src/misc/filters/audio/Resample.js
import { Audio } from '../../../coders/fields/common';
import type { SettingField } from '../../../coders/fields/types';

export const fields: SettingField[] = [
	Audio.Sampling('sampling', { allowInherit: true, allowCustom: true }),
	{
		...Audio.Layout('layout', { allowInherit: true }),
		// Legacy keeps the channel count in step with the layout (2 for anything but mono).
		derive: (value) => ({ channels: value === 'mono' ? 1 : 2 }),
	},
];
