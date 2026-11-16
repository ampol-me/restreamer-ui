// Generated from legacy/src/misc/coders/Encoders/audio/opus_libopus.js by scripts/legacy-extract.mjs, then maintained by hand.
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
	const local = ['-codec:a', 'libopus', '-b:a', `${settings.bitrate}k`, '-shortest'];
	const mapping = {
		global: [],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'libopus';
const name = 'Opus (libopus)';
const codec = 'opus';
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
export { coder, name, codec, type, hwaccel, summarize, defaults };
