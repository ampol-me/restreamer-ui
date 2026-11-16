// Form of legacy/src/misc/filters/video/Transpose.js
import type { SettingField } from '../../../coders/fields/types';

export const fields: SettingField[] = [
	{
		key: 'value',
		type: 'select',
		label: 'Rotate',
		options: [
			{ value: 'none', label: 'None' },
			{ value: '90', label: '90°' },
			{ value: '180', label: '180°' },
			{ value: '270', label: '270°' },
		],
	},
];
