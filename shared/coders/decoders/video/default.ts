// Generated from legacy/src/misc/coders/Decoders/video/default.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const mapping = {
		global: [],
		local: [],
		filter: [],
	};
	return mapping;
}
const coder = 'default';
const name = 'Default';
const codecs = [];
const type = 'video';
const hwaccel = false;
function defaults(stream, skills) {
	const settings = init({});
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codecs, type, hwaccel, defaults, init, createMapping };
