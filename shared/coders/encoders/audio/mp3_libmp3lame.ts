// Generated from legacy/src/misc/coders/Encoders/audio/mp3_libmp3lame.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		bitrate: '64',
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);

	// '-qscale:a', '6'
	const local = ['-codec:a', 'libmp3lame', '-b:a', `${settings.bitrate}k`, '-shortest'];
	const mapping = {
		global: [['-vsync', 'drop']],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'libmp3lame';
const name = 'MP3 (libmp3lame)';
const codec = 'mp3';
const type = 'audio';
const hwaccel = false;
function summarize(settings) {
	return `${name}, ${settings.bitrate} kbit/s`;
}
function defaults(stream, skills) {
	const settings = init({});
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codec, type, hwaccel, summarize, defaults, init, createMapping };
