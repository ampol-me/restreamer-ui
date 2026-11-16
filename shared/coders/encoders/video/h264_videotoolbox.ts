// Generated from legacy/src/misc/coders/Encoders/video/h264_videotoolbox.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		bitrate: '4096',
		fps: '25',
		gop: '2',
		profile: 'auto',
		entropy: 'default',
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const local = [
		'-codec:v',
		'h264_videotoolbox',
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
		'-realtime',
		'true',
	];
	if (settings.gop !== 'auto') {
		local.push('-g', `${Math.round(parseInt(settings.fps) * parseInt(settings.gop)).toFixed(0)}`);
	}
	if (settings.profile !== 'auto') {
		local.push('-profile:v', `${settings.profile}`);
	}
	if (settings.entropy !== 'default') {
		local.push('-coder:v', `${settings.entropy}`);
	}
	const mapping = {
		global: [],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'h264_videotoolbox';
const name = 'H.264 (VideoToolbox)';
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
export { coder, name, codec, type, hwaccel, summarize, defaults };
