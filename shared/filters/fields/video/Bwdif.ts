// Form of legacy/src/misc/filters/video/Bwdif.js
import type { SettingField } from '../../../coders/fields/types';

const enabled = (settings: Record<string, unknown>) => settings.enabled === true;

export const fields: SettingField[] = [
	{ key: 'enabled', type: 'checkbox', label: 'Deinterlace (bwdif)' },
	{
		key: 'mode',
		type: 'select',
		label: 'Deinterlace mode',
		options: [
			{ value: '0', label: 'Each frames' },
			{ value: '1', label: 'Each field' },
		],
		showIf: enabled,
	},
	{
		key: 'parity',
		type: 'select',
		label: 'Deinterlace parity',
		options: [
			{ value: '0', label: 'Top field' },
			{ value: '1', label: 'Bottom field' },
			{ value: '-1', label: 'Auto' },
		],
		cols: 6,
		showIf: enabled,
	},
	{
		key: 'deint',
		type: 'select',
		label: 'Deinterlace deint',
		options: [
			{ value: '0', label: 'All frames' },
			{ value: '1', label: 'Marked frames' },
		],
		cols: 6,
		showIf: enabled,
	},
];
