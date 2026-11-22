// Form of legacy/src/misc/coders/Encoders/video/vp9_libvpx.js
import { Video } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true, cols: 6 }),
	Video.GOP({ allowAuto: true, allowCustom: true, cols: 6 }),
	Video.FpsMode(),
];
