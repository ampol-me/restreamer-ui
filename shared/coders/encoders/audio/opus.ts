// Generated from legacy/src/misc/coders/Encoders/audio/opus.js by scripts/legacy-extract.mjs, then maintained by hand.
// @ts-nocheck -- 1:1 port of untyped legacy logic; typed incrementally.
import Helper from '../../helper';
function init(initialState) {
	const state = {
		bitrate: '64',
		delay: 'auto',
		...initialState,
	};
	return state;
}
function createMapping(settings, stream, skills) {
	stream = Helper.InitStream(stream);
	skills = Helper.InitSkills(skills);
	let sampling = settings.sampling;
	let layout = settings.layout;
	if (sampling === 'inherit') {
		sampling = stream.sampling_hz;
	}
	if (layout === 'inherit') {
		layout = stream.layout;
	}
	const local = ['-codec:a', 'opus', '-b:a', `${settings.bitrate}k`, '-vbr', 'on', '-shortest'];
	if (settings.delay !== 'auto') {
		local.push('opus_delay', settings.delay);
	}
	const mapping = {
		global: [['-vsync', 'drop']],
		local: local,
		filter: [],
	};
	return mapping;
}
const coder = 'opus';
const name = 'Opus';
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
export { coder, name, codec, type, hwaccel, summarize, defaults, init, createMapping };
