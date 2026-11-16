// Generated from legacy/src/misc/coders/Encoders/video/h264_omx.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		bitrate: '4096',
		fps: '25',
		gop: '2',
		profile: 'auto',
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const local = [
		'-codec:v',
		'h264_omx',
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
		local.push('-g', `${Math.round(parseInt(settings.fps) * parseInt(settings.gop)).toFixed(0)}`);
	}
	if (settings.profile !== 'auto') {
		local.push('-profile:v', `${settings.profile}`);
	}
	const mapping = {
		global: [],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'h264_omx';
const name = 'H.264 (OpenMAX IL)';
const codec = 'h264';
const type = 'video';
const hwaccel = true;
function summarize(settings) {
	return `${name}, ${settings.bitrate} kbit/s, ${settings.fps} FPS, Profile: ${settings.profile}`;
}
function defaults(stream, skills) {
	const settings = init({});
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codec, type, hwaccel, summarize, defaults, init, createMapping };
