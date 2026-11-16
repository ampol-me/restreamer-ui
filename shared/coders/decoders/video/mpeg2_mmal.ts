// Generated from legacy/src/misc/coders/Decoders/video/mpeg2_mmal.js by scripts/legacy-extract.mjs, then maintained by hand.
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
		local: ['-c:v', 'mpeg2_mmal'],
		filter: [],
	};
	return mapping;
}
const coder = 'mpeg2_mmal';
const name = 'MPEG2 (MMAL)';
const codecs = ['mpeg2'];
const type = 'video';
const hwaccel = true;
function defaults(stream, skills) {
	const settings = init({});
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codecs, type, hwaccel, defaults };
