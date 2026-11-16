// Generated from legacy/src/misc/coders/Encoders/audio/aac_audiotoolbox.js by scripts/legacy-extract.mjs, then maintained by hand.
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
	const local = ['-codec:a', 'aac_at', '-b:a', `${settings.bitrate}k`, '-shortest'];
	if (stream.codec === 'aac') {
		local.push('-bsf:a', 'aac_adtstoasc');
	}
	const mapping = {
		global: [['-vsync', 'drop']],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'aac_at';
const name = 'AAC (AudioToolbox)';
const codec = 'aac';
const type = 'audio';
const hwaccel = true;
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
