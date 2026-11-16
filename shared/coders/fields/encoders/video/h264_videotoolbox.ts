// Form of legacy/src/misc/coders/Encoders/video/h264_videotoolbox.js
import { Video } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true }),
	Video.GOP({ allowAuto: true, allowCustom: true }),
	Video.Profile(),
	{
		key: 'entropy',
		type: 'select',
		label: 'Entropy coder',
		options: [
			{ value: 'default', label: 'default' },
			{ value: 'cavlc', label: 'CAVLC' },
			{ value: 'cabac', label: 'CABAC' },
		],
	},
];
