// Generated from legacy/src/misc/coders/Encoders/audio/none.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	const local = ['-an'];
	const mapping = {
		global: [],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'none';
const name = 'No Audio';
const codec = 'none';
const type = 'audio';
const hwaccel = false;
function summarize(settings) {
	return `${name}`;
}
function defaults(stream, skills) {
	const settings = {};
	return {
		settings: settings,
		mapping: createMapping(settings, stream, skills),
	};
}
export { coder, name, codec, type, hwaccel, summarize, defaults, createMapping };
