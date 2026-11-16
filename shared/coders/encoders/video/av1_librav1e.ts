// Generated from legacy/src/misc/coders/Encoders/video/av1_librav1e.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		bitrate: '4096',
		fps: '25',
		fps_mode: 'auto',
		gop: '2',
		qp: '-1',
		speed: '-1',
		tiles: '0',
		tile_rows: '0',
		tile_columns: '0',
		params: '',
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const local = [
		'-codec:v',
		'librav1e',
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
		'-qp',
		`${settings.qp}`,
		'-speed',
		`${settings.speed}`,
		'-tiles',
		`${settings.tiles}`,
		'-tile-rows',
		`${settings.tile_rows}`,
		'-tile-columns',
		`${settings.tile_columns}`,
	];
	if (settings.params.length !== 0) {
		local.push('-rav1e-params', `${settings.params}`);
	}
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
	const mapping = {
		global: [],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'librav1e';
const name = 'AV1 (librav1e)';
const codec = 'av1';
const type = 'video';
const hwaccel = false;
function summarize(settings) {
	return `${name}, ${settings.bitrate} kbit/s, ${settings.fps} FPS, Speed: ${settings.speed}, QP: ${settings.qp}`;
}
function defaults(stream, skills) {
	const settings = init({});
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codec, type, hwaccel, summarize, defaults };
