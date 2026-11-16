// Form of legacy/src/misc/filters/audio/Volume.js
import type { SettingField } from '../../../coders/fields/types';

export const fields: SettingField[] = [
	{
		key: 'level',
		type: 'select',
		label: 'Volume',
		options: [
			{ value: 'inherit', label: 'Inherit' },
			...['10', '20', '30', '40', '50', '60', '70', '80', '90'].map((value) => ({ value, label: `${value}%` })),
			// A real value of this filter (it switches to the dB field), not a free-text select.
			{ value: 'custom', label: 'Custom ...' },
		],
		cols: 6,
	},
	{ key: 'db', type: 'number', label: 'Decibels (dB)', cols: 6, disabledIf: (settings) => settings.level !== 'custom' },
];
