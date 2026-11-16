// Generated from legacy/src/misc/coders/Encoders/video/hevc_vaapi.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		bitrate: '4096',
		fps: '25',
		gop: '2',
		profile: '77',
		rc_mode: '1',
		quality: '-1',
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const global = [];
	const local = [];
	const filter = [];

	// https://trac.ffmpeg.org/wiki/Hardware/VAAPI
	global.push(['-vaapi_device', '/dev/dri/renderD128']);
	local.push(
		'-codec:v',
		'hevc_vaapi',
		'-profile:v',
		`${settings.profile}`,
		'-quality',
		`${settings.quality}`,
		'-b:v',
		`${settings.bitrate}k`,
		'-maxrate',
		`${settings.bitrate}k`,
		'-bufsize',
		`${settings.bitrate}k`,
		'-r',
		`${settings.fps}`,
		'-g',
		`${settings.gop}`,
	);
	if (settings.gop !== 'auto') {
		local.push('-g', `${Math.round(parseInt(settings.fps) * parseInt(settings.gop)).toFixed(0)}`);
	}
	filter.push('format=nv12', 'hwupload');
	return {
		global: global,
		local: local,
		filter: filter,
	};
}
const coder = 'hevc_vaapi';
const name = 'HEVC (Intel VAAPI)';
const codec = 'hevc';
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
export { coder, name, codec, type, hwaccel, summarize, defaults };
