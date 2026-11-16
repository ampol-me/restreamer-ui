// Shared by the NVENC encoders written for the Nuxt UI (hevc_nvenc, av1_nvenc).
import { Video, plainOptions } from '../../common';
import type { SettingField, SettingOption } from '../../types';

// The named presets every NVENC SDK understands plus p1 (fastest) … p7 (best quality).
const presetOptions: SettingOption[] = plainOptions('default', 'slow', 'medium', 'fast', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7');

const rateControlOptions: SettingOption[] = plainOptions('auto', 'constqp', 'vbr', 'cbr');

export function nvencFields(profiles: string[]): SettingField[] {
	return [
		Video.Bitrate({ allowCustom: true }),
		Video.Framerate({ allowCustom: true }),
		Video.GOP({ allowAuto: true, allowCustom: true }),
		{ key: 'preset', type: 'select', label: 'Preset', options: presetOptions, cols: 6 },
		{ key: 'profile', type: 'select', label: 'Profile', options: plainOptions('auto', ...profiles), cols: 6 },
		{ key: 'rc', type: 'select', label: 'Rate control', options: rateControlOptions, cols: 6 },
	];
}
