// Settings forms of the coders, looked up by the coder name used in the registries
// (shared/coders/{encoders,decoders}). Coders without settings have an empty form.
import type { SettingField } from './types';

import { fields as AAC } from './encoders/audio/aac';
import { fields as AACAudioToolbox } from './encoders/audio/aac_audiotoolbox';
import { fields as MP3 } from './encoders/audio/mp3_libmp3lame';
import { fields as Opus } from './encoders/audio/opus';
import { fields as Libopus } from './encoders/audio/opus_libopus';
import { fields as Vorbis } from './encoders/audio/vorbis';
import { fields as Libvorbis } from './encoders/audio/vorbis_libvorbis';

import { fields as AV1Rav1e } from './encoders/video/av1_librav1e';
import { fields as AV1SVT } from './encoders/video/av1_libsvtav1';
import { fields as AV1NVENC } from './encoders/video/av1_nvenc';
import { fields as AV1VAAPI } from './encoders/video/av1_vaapi';
import { fields as X264 } from './encoders/video/h264_libx264';
import { fields as H264NVENC } from './encoders/video/h264_nvenc';
import { fields as H264OMX } from './encoders/video/h264_omx';
import { fields as H264V4L2M2M } from './encoders/video/h264_v4l2m2m';
import { fields as H264VAAPI } from './encoders/video/h264_vaapi';
import { fields as H264VideoToolbox } from './encoders/video/h264_videotoolbox';
import { fields as X265 } from './encoders/video/hevc_libx265';
import { fields as HEVCNVENC } from './encoders/video/hevc_nvenc';
import { fields as HEVCVAAPI } from './encoders/video/hevc_vaapi';
import { fields as HEVCVideoToolbox } from './encoders/video/hevc_videotoolbox';
import { fields as VP9 } from './encoders/video/vp9_libvpx';
import { fields as VP9VAAPI } from './encoders/video/vp9_vaapi';

export type { SettingField, SettingOption, SettingsContext } from './types';

export type CoderType = 'video' | 'audio';

type FieldsByCoder = Record<CoderType, Record<string, SettingField[]>>;

const encoders: FieldsByCoder = {
	audio: {
		copy: [],
		none: [],
		aac: AAC,
		aac_at: AACAudioToolbox,
		libmp3lame: MP3,
		opus: Opus,
		libopus: Libopus,
		vorbis: Vorbis,
		libvorbis: Libvorbis,
	},
	video: {
		copy: [],
		none: [],
		libx264: X264,
		h264_videotoolbox: H264VideoToolbox,
		h264_nvenc: H264NVENC,
		h264_omx: H264OMX,
		h264_v4l2m2m: H264V4L2M2M,
		h264_vaapi: H264VAAPI,
		libx265: X265,
		hevc_vaapi: HEVCVAAPI,
		hevc_videotoolbox: HEVCVideoToolbox,
		vp9_vaapi: VP9VAAPI,
		'libvpx-vp9': VP9,
		librav1e: AV1Rav1e,
		rawvideo: [],
		hevc_nvenc: HEVCNVENC,
		av1_nvenc: AV1NVENC,
		av1_vaapi: AV1VAAPI,
		libsvtav1: AV1SVT,
	},
};

// No legacy decoder has a settings form.
const decoders: FieldsByCoder = {
	audio: {
		default: [],
	},
	video: {
		default: [],
		videotoolbox: [],
		av1_cuvid: [],
		cuda: [],
		h264_mmal: [],
		h264_cuvid: [],
		hevc_cuvid: [],
		mjpeg_cuvid: [],
		mpeg1_cuvid: [],
		mpeg2_cuvid: [],
		mpeg2_mmal: [],
		mpeg4_cuvid: [],
		mpeg4_mmal: [],
		vc1_cuvid: [],
		vc1_mmal: [],
		vp8_cuvid: [],
		vp9_cuvid: [],
	},
};

/** True when the coder is known here, also when its form is empty. */
export function hasEncoderFields(type: CoderType, coder: string): boolean {
	return Object.hasOwn(encoders[type] ?? {}, coder);
}

export function hasDecoderFields(type: CoderType, coder: string): boolean {
	return Object.hasOwn(decoders[type] ?? {}, coder);
}

export function getEncoderFields(type: CoderType, coder: string): SettingField[] {
	return hasEncoderFields(type, coder) ? encoders[type][coder]! : [];
}

export function getDecoderFields(type: CoderType, coder: string): SettingField[] {
	return hasDecoderFields(type, coder) ? decoders[type][coder]! : [];
}
