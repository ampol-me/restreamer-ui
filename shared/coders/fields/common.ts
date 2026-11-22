// Option lists and field builders shared by the coder and filter forms. Ported from the
// widgets in legacy/src/misc/coders/settings/{Video,Audio}.js. The legacy "Custom ..." entry
// is not part of the lists: a field with `allowCustom` gets it from the form component.
import Helper from '../helper';
import type { SettingField, SettingOption, SettingsContext } from './types';

type Cols = SettingField['cols'];

interface SelectVariant {
	allowAuto?: boolean;
	allowInherit?: boolean;
	allowCustom?: boolean;
	label?: string;
	customLabel?: string;
	cols?: Cols;
}

/** Options whose label is the value itself. */
export function plainOptions(...values: string[]): SettingOption[] {
	return values.map((value) => ({ value, label: value }));
}

const AUTO: SettingOption = { value: 'auto', label: 'auto' };
const INHERIT: SettingOption = { value: 'inherit', label: 'Inherit' };

function variantOptions(options: SettingOption[], variant: SelectVariant): SettingOption[] {
	// Same order as legacy: "Inherit" before "auto" before the values.
	return [...(variant.allowInherit ? [INHERIT] : []), ...(variant.allowAuto ? [AUTO] : []), ...options];
}

function selectField(key: string, label: string, customLabel: string, options: SettingOption[], variant: SelectVariant, help?: string): SettingField {
	const field: SettingField = { key, type: 'select', label: variant.label ?? label, options: variantOptions(options, variant) };
	if (variant.allowCustom) {
		field.allowCustom = true;
		field.customLabel = variant.customLabel ?? customLabel;
	}
	if (help) field.help = help;
	if (variant.cols) field.cols = variant.cols;
	return field;
}

export const videoBitrateOptions: SettingOption[] = ['32768', '24576', '20480', '16384', '12288', '8192', '4096', '2048', '1024', '512', '256'].map(
	(value) => ({ value, label: `${value} kbit/s` }),
);

export const gopOptions: SettingOption[] = plainOptions('1', '2', '4', '10');

export const framerateOptions: SettingOption[] = [
	{ value: '60', label: '60' },
	{ value: '59.94', label: '59.94' },
	{ value: '50', label: '50' },
	{ value: '30', label: '30' },
	{ value: '29.97', label: '29.97 (NTSC)' },
	{ value: '25', label: '25 (PAL)' },
	{ value: '24', label: '24 (Film)' },
	{ value: '23.97', label: '23.97 (NTSC Film)' },
	{ value: '15', label: '15' },
	{ value: '10', label: '10' },
];

export const profileOptions: SettingOption[] = plainOptions('auto', 'baseline', 'main', 'high');

// https://en.wikipedia.org/wiki/Graphics_display_resolution
export const sizeOptions: SettingOption[] = [
	{ value: '7680x4320', label: '7680x4320 (8K UHD)' },
	{ value: '5120x2880', label: '5120x2880 (5K)' },
	{ value: '4096x2160', label: '4096x2160 (DCI 4K)' },
	{ value: '3840x2160', label: '3840x2160 (4K UHD)' },
	{ value: '3200x1800', label: '3200x1800 (QHD+)' },
	{ value: '2560x1600', label: '2560x1600 (WQXGA)' },
	{ value: '2560x1440', label: '2560x1440 (QHD, WQHD)' },
	{ value: '2048x1080', label: '2048x1080 (DCI 2K)' },
	{ value: '1920x1080', label: '1920x1080 (Full HD)' },
	{ value: '1600x900', label: '1600x900 (HD+)' },
	{ value: '1280x1080', label: '1280x1080' },
	{ value: '1280x720', label: '1280x720 (HD)' },
	{ value: '960x540', label: '960x540 (qHD)' },
	{ value: '640x360', label: '640x360 (nHD)' },
];

export const heightOptions: SettingOption[] = plainOptions('4320', '2880', '2160', '1800', '1600', '1440', '1080', '900', '720', '540', '360');

export const widthOptions: SettingOption[] = plainOptions('7680', '5120', '4096', '3840', '3200', '2560', '2048', '1920', '1600', '1280', '960', '640');

export const formatOptions: SettingOption[] = [
	{ value: 'yuv420p', label: 'yuv420p' },
	{ value: 'nv12', label: 'nv12' },
	{ value: 'h264', label: 'H.264' },
	{ value: 'mjpeg', label: 'MJPEG' },
];

export const pixFormatOptions: SettingOption[] = plainOptions('yuv420p', 'nv12');

export const fpsModeOptions: SettingOption[] = [
	{ value: 'passthrough', label: 'Frame is passed through (Passthrough)' },
	{ value: 'cfr', label: 'Constant frame rate (CFR)' },
	{ value: 'vfr', label: 'Variable frame rate (VFR)' },
	{ value: 'auto', label: 'Choose between CFR and VFR (Auto)' },
];

export const audioBitrateOptions: SettingOption[] = ['256', '128', '64', '32', '16', '8'].map((value) => ({ value, label: `${value} kbit/s` }));

export const layoutOptions: SettingOption[] = plainOptions('mono', 'stereo');

export const extendedLayoutOptions: SettingOption[] = [
	...layoutOptions,
	...[
		'2.1',
		'3.0',
		'3.0(back)',
		'4.0',
		'quad',
		'quad(side)',
		'3.1',
		'5.0',
		'5.0(side)',
		'4.1',
		'5.1',
		'5.1(side)',
		'6.0',
		'6.0(front)',
		'3.1.2',
		'hexagonal',
		'6.1',
		'6.1(back)',
		'6.1(front)',
		'7.0',
		'7.0(front)',
		'7.1',
		'7.1(wide)',
		'7.1(wide-side)',
		'5.1.2',
		'octagonal',
		'cube',
		'5.1.4',
		'7.1.2',
		'7.1.4',
		'hexadecagonal',
		'downmix',
		'22.2',
	].map((value) => ({ value, label: value.replace('(', ' (') })),
];

export const samplingOptions: SettingOption[] = ['96000', '88200', '48000', '44100', '22050', '8000'].map((value) => ({ value, label: `${value} Hz` }));

/** The coders only pass `-fps_mode` to FFmpeg 5 and later, so the field is hidden before that. */
export function ffmpeg5(_settings: Record<string, unknown>, ctx: SettingsContext): boolean {
	return Helper.InitSkills(ctx?.skills).ffmpeg.version_major >= 5;
}

export const Video = {
	Bitrate: (variant: SelectVariant = {}) => selectField('bitrate', 'Bitrate', 'Custom bitrate (kbit/s)', videoBitrateOptions, variant),
	GOP: (variant: SelectVariant = {}) => selectField('gop', 'Keyframe interval (seconds)', 'Custom keyframe interval', gopOptions, variant),
	Framerate: (variant: SelectVariant = {}) => selectField('fps', 'Framerate', 'Custom framerate', framerateOptions, variant),
	Profile: (variant: SelectVariant = {}) => selectField('profile', 'Profile', '', profileOptions, variant),
	Size: (key: string, variant: SelectVariant = {}) => selectField(key, 'Size', 'Custom size', sizeOptions, variant),
	Width: (key: string, variant: SelectVariant = {}) => selectField(key, 'Width', 'Custom size', widthOptions, variant),
	Height: (key: string, variant: SelectVariant = {}) => selectField(key, 'Height', 'Custom size', heightOptions, variant),
	Format: (key: string, variant: SelectVariant = {}) => selectField(key, 'Format', 'Custom format', formatOptions, variant),
	PixFormat: (key: string, variant: SelectVariant = {}) => selectField(key, 'Pixel Format', 'Custom format', pixFormatOptions, variant),
	FpsMode: (variant: SelectVariant = {}): SettingField => ({ ...selectField('fps_mode', 'Framerate mode', '', fpsModeOptions, variant), showIf: ffmpeg5 }),
};

export const Audio = {
	Bitrate: (variant: SelectVariant = {}) =>
		selectField('bitrate', 'Bitrate', 'Custom bitrate (kbit/s)', audioBitrateOptions, variant, 'The bitrate of the audio stream.'),
	Layout: (key: string, variant: SelectVariant & { extended?: boolean } = {}) =>
		selectField(key, 'Layout', 'Custom layout', variant.extended ? extendedLayoutOptions : layoutOptions, variant, 'The layout of the audio stream.'),
	Sampling: (key: string, variant: SelectVariant = {}) =>
		selectField(key, 'Sampling', 'Custom sampling (Hz)', samplingOptions, variant, 'The sample rate of the audio stream.'),
};
