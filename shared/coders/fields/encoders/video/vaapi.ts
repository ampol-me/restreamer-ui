// The form shared by the legacy VAAPI encoders (h264_vaapi, hevc_vaapi, vp9_vaapi): the three
// legacy modules are copies of each other, including the H.264 profile numbers.
import { Video } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	{
		key: 'rc_mode',
		type: 'select',
		label: 'Rate control',
		options: [
			{ value: '0', label: 'auto' },
			{ value: '1', label: 'Constant-quality' },
			{ value: '2', label: 'Constant-bitrate' },
			{ value: '3', label: 'Variable-bitrate' },
			{ value: '4', label: 'Intelligent constant-quality' },
			{ value: '5', label: 'Quality-defined variable-bitrate' },
			{ value: '6', label: 'Average variable-bitrate' },
		],
	},
	Video.Bitrate({ allowCustom: true, cols: 6 }),
	Video.Framerate({ allowCustom: true, cols: 6 }),
	Video.GOP({ allowAuto: true, allowCustom: true, cols: 6 }),
	{ key: 'quality', type: 'number', label: 'Quality', cols: 6 },
	{
		key: 'profile',
		type: 'select',
		label: 'Profile',
		options: [
			{ value: '578', label: 'baseline (constrained)' },
			{ value: '77', label: 'main' },
			{ value: '100', label: 'high' },
		],
		cols: 6,
	},
];
