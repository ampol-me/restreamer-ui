// Form of the AV1 VAAPI encoder (no legacy counterpart).
import { Video } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	{
		key: 'rc_mode',
		type: 'select',
		label: 'Rate control',
		options: [
			{ value: 'auto', label: 'auto' },
			{ value: 'CQP', label: 'Constant-quality' },
			{ value: 'CBR', label: 'Constant-bitrate' },
			{ value: 'VBR', label: 'Variable-bitrate' },
			{ value: 'ICQ', label: 'Intelligent constant-quality' },
			{ value: 'QVBR', label: 'Quality-defined variable-bitrate' },
			{ value: 'AVBR', label: 'Average variable-bitrate' },
		],
	},
	Video.Bitrate({ allowCustom: true, cols: 6 }),
	Video.Framerate({ allowCustom: true, cols: 6 }),
	Video.GOP({ allowAuto: true, allowCustom: true, cols: 6 }),
];
