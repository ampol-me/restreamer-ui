// Form of legacy/src/misc/filters/video/Scale.js
import { Video } from '../../../coders/fields/common';
import type { SettingField } from '../../../coders/fields/types';

const mode: SettingField = {
	key: 'mode',
	type: 'select',
	label: 'Scale',
	options: [
		{ value: 'none', label: 'None' },
		{ value: 'fix', label: 'Fix size' },
		{ value: 'height', label: 'By height' },
		{ value: 'width', label: 'By width' },
	],
};

export const fields: SettingField[] = [
	// Legacy gives the mode the full row until a size select joins it; a field's width is
	// static, hence the two variants of the same field.
	{ ...mode, showIf: (settings) => settings.mode === 'none' },
	{ ...mode, cols: 4, showIf: (settings) => settings.mode !== 'none' },
	{ ...Video.Size('fix', { allowCustom: true, label: 'Scale size', cols: 8 }), showIf: (settings) => settings.mode === 'fix' },
	{ ...Video.Width('width', { allowCustom: true, label: 'Scale size', cols: 8 }), showIf: (settings) => settings.mode === 'width' },
	{ ...Video.Height('height', { allowCustom: true, label: 'Scale size', cols: 8 }), showIf: (settings) => settings.mode === 'height' },
];
