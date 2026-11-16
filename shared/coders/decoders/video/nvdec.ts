// Generated from legacy/src/misc/coders/Decoders/video/nvdec.js by scripts/legacy-extract.mjs, then maintained by hand.
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
		local: ['-hwaccel', 'cuda', '-hwaccel_output_format', 'cuda'],
		filter: [],
	};
	return mapping;
}
// -hwaccel cuda -hwaccel_output_format cuda

const coder = 'cuda';
const name = 'NVDEC (CUDA)';
const codecs = ['h264', 'hevc', 'mpeg1', 'mpeg2', 'mpeg4', 'vp8', 'vp9', 'vc1'];
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
