// Form of legacy/src/misc/coders/Encoders/video/hevc_videotoolbox.js
import { Video, plainOptions } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true }),
	Video.GOP({ allowAuto: true, allowCustom: true }),
	{ key: 'profile', type: 'select', label: 'Profile', options: plainOptions('auto', 'main', 'main10') },
];
