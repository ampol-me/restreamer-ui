// Generated from legacy/src/misc/coders/Decoders/video/av1_cuvid.js by scripts/legacy-extract.mjs, then maintained by hand.
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
		local: ['-hwaccel', 'cuda', '-c:v', 'av1_cuvid'],
		filter: [],
	};
	return mapping;
}
// -hwaccel nvdec

const coder = 'av1_cuvid';
const name = 'AV1 (CUVID)';
const codecs = ['av1'];
const type = 'video';
const hwaccel = true;
function defaults(stream, skills) {
	const settings = init({});
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codecs, type, hwaccel, defaults, init, createMapping };
