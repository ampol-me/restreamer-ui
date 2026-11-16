// Form of legacy/src/misc/filters/audio/Pan.js
import type { SettingField } from '../../../coders/fields/types';

export const fields: SettingField[] = [
	{
		key: 'value',
		type: 'select',
		label: 'Pan',
		options: [
			{ value: 'inherit', label: 'Inherit' },
			{ value: 'mute_left', label: 'Mute left' },
			{ value: 'mute_right', label: 'Mute right' },
		],
		help: 'Mute a channel.',
	},
];
