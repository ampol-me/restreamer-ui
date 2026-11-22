// Form of legacy/src/misc/coders/Encoders/video/h264_nvenc.js
import { Video, plainOptions } from '../../common';
import type { SettingField, SettingOption } from '../../types';

export const rateControlOptions: SettingOption[] = plainOptions('auto', 'constqp', 'vbr', 'cbr', 'cbr_ld_hq', 'cbr_hq', 'vbr_hq');

export const fields: SettingField[] = [
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true }),
	Video.GOP({ allowAuto: true, allowCustom: true }),
	{
		key: 'preset',
		type: 'select',
		label: 'Preset',
		options: [
			...plainOptions('default', 'slow', 'medium', 'fast', 'hp', 'hq'),
			// Legacy labels the "bd" (Blu-ray) preset "db".
			{ value: 'bd', label: 'db' },
			...plainOptions('ll', 'llhq', 'llhp', 'lossless', 'losslesshp', 'losslesshq'),
		],
		cols: 6,
	},
	{ key: 'profile', type: 'select', label: 'Profile', options: plainOptions('auto', 'baseline', 'main', 'high', 'high444p'), cols: 6 },
	{
		key: 'level',
		type: 'select',
		label: 'Level',
		options: plainOptions(
			'auto',
			'1',
			'1.0',
			'1b',
			'1.0b',
			'1.1',
			'1.2',
			'1.3',
			'2',
			'2.0',
			'2.1',
			'2.2',
			'3',
			'3.0',
			'3.1',
			'3.2',
			'4',
			'4.0',
			'4.1',
			'4.2',
			'5',
			'5.0',
			'5.1',
		),
		cols: 6,
	},
	{ key: 'rc', type: 'select', label: 'Rate control', options: rateControlOptions, cols: 6 },
];
