// Form of the SVT-AV1 encoder (no legacy counterpart).
import { Video } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true, cols: 6 }),
	Video.GOP({ allowAuto: true, allowCustom: true, cols: 6 }),
	Video.FpsMode(),
	{
		key: 'preset',
		type: 'select',
		label: 'Speed Preset',
		options: Array.from({ length: 14 }, (_, i) => ({ value: `${i}`, label: i === 0 ? 'slowest (0)' : i === 13 ? 'fastest (13)' : `${i}` })),
		help: 'What speed preset to use.',
		cols: 6,
	},
	{
		key: 'params',
		type: 'text',
		label: 'SVT-AV1 Parameters',
		help: 'Set the SVT-AV1 configuration using a :-separated list of key=value parameters.',
	},
];
