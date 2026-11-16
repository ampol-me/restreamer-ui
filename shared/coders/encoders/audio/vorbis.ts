// Generated from legacy/src/misc/coders/Encoders/audio/vorbis.js by scripts/legacy-extract.mjs, then maintained by hand.
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
	const local = ['-codec:a', 'vorbis', '-b:a', `${settings.bitrate}k`, '-qscale:a', '3', '-shortest'];
	const mapping = {
		global: [['-vsync', 'drop']],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'vorbis';
const name = 'Vorbis';
const codec = 'vorbis';
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
