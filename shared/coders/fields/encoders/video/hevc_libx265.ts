// Form of legacy/src/misc/coders/Encoders/video/hevc_libx265.js
import { Video, plainOptions } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true, cols: 6 }),
	Video.GOP({ allowAuto: true, allowCustom: true, cols: 6 }),
	Video.FpsMode(),
	{
		key: 'preset',
		type: 'select',
		label: 'Preset',
		options: plainOptions('ultrafast', 'superfast', 'veryfast', 'faster', 'fast', 'medium', 'slow', 'slower', 'veryslow'),
		cols: 6,
	},
	Video.Profile({ cols: 6 }),
	{
		key: 'tune',
		type: 'select',
		label: 'Tune',
		options: plainOptions('none', 'animation', 'fastdecode', 'film', 'grain', 'stillimage', 'zerolatency'),
		cols: 6,
	},
];
