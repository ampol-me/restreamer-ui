// Generated from legacy/src/misc/coders/Encoders/video/copy.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const local = ['-codec:v', 'copy'];
	const mapping = {
		global: [],
		local: local,
		filter: [],
	};
	return mapping;
}
function summarize(settings) {
	return `${name}`;
}
function defaults(stream, skills) {
	return {
		settings: {},
		mapping: createMapping({}, stream, skills),
	};
}
const coder = 'copy';
const name = 'Passthrough (copy)';
const codec = 'copy';
const type = 'video';
const hwaccel = false;
export { coder, name, codec, type, hwaccel, summarize, defaults };
