// Form of legacy/src/misc/coders/Encoders/video/h264_v4l2m2m.js
import { Video } from '../../common';
import type { SettingField } from '../../types';

export const fields: SettingField[] = [
	{
		key: '',
		type: 'note',
		label: 'V4L2_M2M is experimental.',
		help: 'We recommend OpenMAX IL for Raspberry PI (3/4) with a 32-bit operating system.',
	},
	Video.Bitrate({ allowCustom: true }),
	Video.Framerate({ allowCustom: true }),
	{
		...Video.GOP({ allowAuto: true, allowCustom: true }),
		help: 'To stabilize the system, increase the HLS segment length for the keyframe interval by 2-3 * (Processing and Control).',
	},
	Video.FpsMode(),
	{ key: 'force_key_frames', type: 'text', label: 'Force key frames' },
	{ key: 'num_capture_buffers', type: 'number', label: 'Capture buffer', cols: 6 },
	{ key: 'num_output_buffers', type: 'number', label: 'Output buffer', cols: 6 },
];
