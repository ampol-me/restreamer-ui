// AV1 on NVIDIA GPUs. Mirrors h264_nvenc; written for the Nuxt UI (no legacy counterpart).
import type { CoderMapping, CoderSkills, CoderStream } from '../../types';
import { gopFrames } from '../../types';

export interface Settings {
	bitrate: string;
	fps: string;
	gop: string;
	preset: string;
	profile: string;
	rc: string;
}

function init(initialState?: Partial<Settings>): Settings {
	return {
		bitrate: '4096',
		fps: '25',
		gop: '2',
		preset: 'medium',
		profile: 'auto',
		rc: 'auto',
		...initialState,
	};
}

function createMapping(settings: Settings, _stream?: CoderStream, _skills?: CoderSkills): CoderMapping {
	const local = [
		'-codec:v',
		'av1_nvenc',
		'-preset:v',
		`${settings.preset}`,
		'-b:v',
		`${settings.bitrate}k`,
		'-maxrate',
		`${settings.bitrate}k`,
		'-bufsize',
		`${settings.bitrate}k`,
		'-r',
		`${settings.fps}`,
		'-pix_fmt',
		'yuv420p',
	];

	if (settings.gop !== 'auto') {
		local.push('-g', gopFrames(settings.fps, settings.gop));
	}

	if (settings.profile !== 'auto') {
		local.push('-profile:v', `${settings.profile}`);
	}

	if (settings.rc !== 'auto') {
		local.push('-rc:v', `${settings.rc}`);
	}

	return { global: [], local, filter: [] };
}

const coder = 'av1_nvenc';
const name = 'AV1 (NVENC)';
const codec = 'av1';
const type = 'video';
const hwaccel = true;

function summarize(settings: Settings): string {
	return `${name}, ${settings.bitrate} kbit/s, ${settings.fps} FPS, Preset: ${settings.preset}`;
}

function defaults(stream?: CoderStream, skills?: CoderSkills) {
	const settings = init({});

	return {
		settings,
		mapping: createMapping(settings, stream, skills),
	};
}

export { coder, name, codec, type, hwaccel, init, createMapping, summarize, defaults };
