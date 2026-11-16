// Form of legacy/src/misc/filters/video/Framerate.js
import { Video } from '../../../coders/fields/common';
import type { SettingField } from '../../../coders/fields/types';

export const fields: SettingField[] = [
	{ key: 'enabled', type: 'checkbox', label: 'Framerate conversion (frame interpolation)' },
	{ ...Video.Framerate({ allowCustom: true }), showIf: (settings) => settings.enabled === true },
];
