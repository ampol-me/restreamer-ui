// AV1 with SVT-AV1, the software AV1 encoder that is fast enough for live use.
// Written for the Nuxt UI (no legacy counterpart).
// https://gitlab.com/AOMediaCodec/SVT-AV1/-/blob/master/Docs/Ffmpeg.md
import type { CoderMapping, CoderSkills, CoderStream } from '../../types';
import { gopFrames } from '../../types';

export interface Settings {
	bitrate: string;
	fps: string;
	fps_mode: string;
	gop: string;
	// 0 (slowest, best) … 13 (fastest). Live encoding needs the fast end.
	preset: string;
	// Extra -svtav1-params, e.g. "tune=0:fast-decode=1".
	params: string;
}

function init(initialState?: Partial<Settings>): Settings {
	return {
		bitrate: '4096',
		fps: '25',
		fps_mode: 'auto',
		gop: '2',
		preset: '10',
		params: '',
		...initialState,
	};
}

function createMapping(settings: Settings, _stream?: CoderStream, skills?: CoderSkills): CoderMapping {
	const local = [
		'-codec:v',
		'libsvtav1',
		'-preset:v',
		`${settings.preset}`,
		'-b:v',
		`${settings.bitrate}k`,
		'-maxrate:v',
		`${settings.bitrate}k`,
		'-bufsize:v',
		`${settings.bitrate}k`,
		'-r',
		`${settings.fps}`,
		'-pix_fmt',
		'yuv420p',
	];

	if (settings.params.length !== 0) {
		local.push('-svtav1-params', `${settings.params}`);
	}

	if (settings.gop !== 'auto') {
		local.push('-g', gopFrames(settings.fps, settings.gop));
	}

	// Same default as the legacy coder helper: assume FFmpeg 5 when the core did not say.
	if ((skills?.ffmpeg?.version_major ?? 5) >= 5) {
		local.push('-fps_mode', `${settings.fps_mode}`);
	}

	return { global: [], local, filter: [] };
}

const coder = 'libsvtav1';
const name = 'AV1 (SVT-AV1)';
const codec = 'av1';
const type = 'video';
const hwaccel = false;

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
