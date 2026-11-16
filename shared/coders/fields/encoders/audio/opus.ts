// Form of legacy/src/misc/coders/Encoders/audio/opus.js
import { Audio } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	Audio.Bitrate({ allowCustom: true }),
	{
		key: 'delay',
		type: 'select',
		label: 'Delay',
		options: [
			{ value: 'auto', label: 'auto' },
			{ value: '20', label: '20ms' },
			{ value: '30', label: '30ms' },
			{ value: '50', label: '50ms' },
		],
		allowCustom: true,
		customLabel: 'Custom delay',
		help: 'Maximum delay in milliseconds.',
	},
];
