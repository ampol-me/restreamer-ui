// AV1 through VAAPI (Intel Arc / recent AMD). Written for the Nuxt UI (no legacy counterpart).
// https://trac.ffmpeg.org/wiki/Hardware/VAAPI
import type { CoderMapping, CoderSkills, CoderStream } from '../../types';
import { gopFrames } from '../../types';

export interface Settings {
	bitrate: string;
	fps: string;
	gop: string;
	rc_mode: string;
}

function init(initialState?: Partial<Settings>): Settings {
	return {
		bitrate: '4096',
		fps: '25',
		gop: '2',
		rc_mode: 'auto',
		...initialState,
	};
}

function createMapping(settings: Settings, _stream?: CoderStream, _skills?: CoderSkills): CoderMapping {
	const local = [
		'-codec:v',
		'av1_vaapi',
		'-b:v',
		`${settings.bitrate}k`,
		'-maxrate',
		`${settings.bitrate}k`,
		'-bufsize',
		`${settings.bitrate}k`,
		'-r',
		`${settings.fps}`,
	];

	if (settings.rc_mode !== 'auto') {
		local.push('-rc_mode', `${settings.rc_mode}`);
	}

	if (settings.gop !== 'auto') {
		local.push('-g', gopFrames(settings.fps, settings.gop));
	}

	return {
		global: [['-vaapi_device', '/dev/dri/renderD128']],
		local,
		filter: ['format=nv12', 'hwupload'],
	};
}

const coder = 'av1_vaapi';
const name = 'AV1 (VAAPI)';
const codec = 'av1';
const type = 'video';
const hwaccel = true;

function summarize(settings: Settings): string {
	return `${name}, ${settings.bitrate} kbit/s, ${settings.fps} FPS`;
}

function defaults(stream?: CoderStream, skills?: CoderSkills) {
	const settings = init({});

	return {
		settings,
		mapping: createMapping(settings, stream, skills),
	};
}

export { coder, name, codec, type, hwaccel, init, createMapping, summarize, defaults };
