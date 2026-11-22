// Form of legacy/src/misc/coders/Encoders/video/av1_librav1e.js
import { Video } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true, cols: 6 }),
	Video.GOP({ allowAuto: true, allowCustom: true, cols: 6 }),
	Video.FpsMode(),
	{
		key: 'speed',
		type: 'select',
		label: 'Speed Preset',
		options: [
			{ value: '-1', label: 'auto (-1)' },
			{ value: '0', label: 'slowest (0)' },
			...['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((value) => ({ value, label: value })),
			{ value: '10', label: 'fastest (10)' },
		],
		help: 'What speed preset to use.',
		cols: 6,
	},
	{ key: 'qp', type: 'number', label: 'QP', help: 'Constant Quantizer Mode (-1 to 255).', min: -1, max: 255, cols: 6 },
	{ key: 'tiles', type: 'number', label: 'Tiles', help: 'Number of tiles encode with.', min: -1, cols: 4 },
	{ key: 'tile_rows', type: 'number', label: 'Tile Rows', help: 'Number of tiles rows to encode with.', min: -1, cols: 4 },
	{ key: 'tile_columns', type: 'number', label: 'Tile Columns', help: 'Number of tiles columns to encode with.', min: -1, cols: 4 },
	{
		key: 'params',
		type: 'text',
		label: 'rav1e Parameters',
		help: 'Set the rav1e configuration using a :-separated list of key=value parameters.',
	},
];
