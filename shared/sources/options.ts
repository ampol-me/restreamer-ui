// Option lists of the selects the source forms share.
// Ported from legacy/src/misc/coders/settings/Video.js and Audio.js (only what the sources use).

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export const framerates: SelectOption[] = [
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

export const sizes: SelectOption[] = [
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

export const formats: SelectOption[] = [
	{ value: 'yuv420p', label: 'yuv420p' },
	{ value: 'nv12', label: 'nv12' },
	{ value: 'h264', label: 'H.264' },
	{ value: 'mjpeg', label: 'MJPEG' },
];

export const samplings: SelectOption[] = [
	{ value: '96000', label: '96000 Hz' },
	{ value: '88200', label: '88200 Hz' },
	{ value: '48000', label: '48000 Hz' },
	{ value: '44100', label: '44100 Hz' },
	{ value: '22050', label: '22050 Hz' },
	{ value: '8000', label: '8000 Hz' },
];

export const layouts: SelectOption[] = [
	{ value: 'mono', label: 'mono' },
	{ value: 'stereo', label: 'stereo' },
];

export const fflags = ['discardcorrupt', 'fastseek', 'genpts', 'igndts', 'ignidx', 'nobuffer', 'nofillin', 'noparse', 'sortdts'];

export interface UploadType {
	mimetype: string;
	extension: string;
	maxSize: number;
}

export type UploadError =
	| { type: 'nofiles' }
	| { type: 'mimetype'; actual: string; allowed: string[] }
	| { type: 'size'; actual: number; allowed: number }
	| { type: 'read'; message: string };

/**
 * The accepted type a file falls under, or the reason it is rejected.
 * Ported from the checks in legacy/src/misc/UploadButton.js.
 */
export function checkUpload(file: { type: string; size: number } | undefined, acceptTypes: UploadType[]): { type: UploadType } | { error: UploadError } {
	if (!file) {
		return { error: { type: 'nofiles' } };
	}

	let type: UploadType | null = null;
	for (const t of acceptTypes) {
		const accept = t.mimetype.split('/');
		const actual = file.type.split('/');

		if (accept[0] !== actual[0]) {
			continue;
		}

		if (accept[1] === '*' || accept[1] === actual[1]) {
			type = t;
			break;
		}
	}

	if (type === null) {
		return { error: { type: 'mimetype', actual: file.type, allowed: acceptTypes.map((t) => t.mimetype) } };
	}

	if (file.size > type.maxSize) {
		return { error: { type: 'size', actual: file.size, allowed: type.maxSize } };
	}

	return { type };
}
