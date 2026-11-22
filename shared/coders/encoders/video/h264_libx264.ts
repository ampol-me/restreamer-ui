// Generated from legacy/src/misc/coders/Encoders/video/h264_libx264.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		preset: 'ultrafast',
		bitrate: '4096',
		fps: '25',
		gop: '2',
		profile: 'auto',
		tune: 'zerolatency',
		fps_mode: 'auto',
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const local = [
		'-codec:v',
		'libx264',
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
		'-sc_threshold',
		'0',
		'-pix_fmt',
		'yuv420p',
	];
	if (settings.gop !== 'auto') {
		local.push(
			'-g',
			`${Math.round(parseInt(settings.fps) * parseInt(settings.gop)).toFixed(0)}`,
			'-keyint_min',
			`${Math.round(parseInt(settings.fps) * parseInt(settings.gop)).toFixed(0)}`,
		);
	}
	if (skills.ffmpeg.version_major >= 5) {
		local.push('-fps_mode', `${settings.fps_mode}`);
	}
	if (settings.profile !== 'auto') {
		local.push('-profile:v', `${settings.profile}`);
	}
	if (settings.tune !== 'none') {
		local.push('-tune:v', `${settings.tune}`);
	}
	const mapping = {
		global: [],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'libx264';
const name = 'H.264 (libx264)';
const codec = 'h264';
const type = 'video';
const hwaccel = false;
function summarize(settings) {
	return `${name}, ${settings.bitrate} kbit/s, ${settings.fps} FPS, Preset: ${settings.preset}, Profile: ${settings.profile}`;
}
function defaults(stream, skills) {
	const settings = init({});
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codec, type, hwaccel, summarize, defaults, init, createMapping };
